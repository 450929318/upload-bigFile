import request from '@/utils/request'

export function upload(data) {
    return request({
        url: `/api/upload`,
        method: 'post',
        data
    })
}

export function merge(data) {
    return request({
        url: `/api/merge`,
        method: 'post',
        data
    })
}

export function verify(data) {
    return request({
        url: `/api/verify`,
        method: 'post',
        data
    })
}