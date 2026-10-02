// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library Address {

    function isContract(address account) internal view returns (bool) {

        return account.code.length > 0;
    }

    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCall(target, data, "Address: low-level call failed");
    }

    function functionCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        require(isContract(target), "Address: call to non-contract");

        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    function functionStaticCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");

        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    function functionDelegateCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");

        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function verifyCallResult(
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) internal pure returns (bytes memory) {
        if (success) {
            return returndata;
        } else {

            if (returndata.length > 0) {

                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

interface IBeacon {

    function implementation() external view returns (address);
}

interface IERC20 {

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

library Math {

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function average(uint256 a, uint256 b) internal pure returns (uint256) {

        return (a & b) + (a ^ b) / 2;
    }

    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {

        return a / b + (a % b == 0 ? 0 : 1);
    }
}

library SignedMath {

    function max(int256 a, int256 b) internal pure returns (int256) {
        return a >= b ? a : b;
    }

    function min(int256 a, int256 b) internal pure returns (int256) {
        return a < b ? a : b;
    }

    function average(int256 a, int256 b) internal pure returns (int256) {

        int256 x = (a & b) + ((a ^ b) >> 1);
        return x + (int256(uint256(x) >> 255) & (a ^ b));
    }

    function abs(int256 n) internal pure returns (uint256) {
        unchecked {

            return uint256(n >= 0 ? n : -n);
        }
    }
}

interface IERC20Metadata is IERC20 {

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);
}

library SafeERC20 {
    using Address for address;

    function safeTransfer(
        IERC20 token,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function safeApprove(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {

        require(
            (value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function safeIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        uint256 newAllowance = token.allowance(address(this), spender) + value;
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    function safeDecreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        unchecked {
            uint256 oldAllowance = token.allowance(address(this), spender);
            require(oldAllowance >= value, "SafeERC20: decreased allowance below zero");
            uint256 newAllowance = oldAllowance - value;
            _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
        }
    }

    function _callOptionalReturn(IERC20 token, bytes memory data) private {

        bytes memory returndata = address(token).functionCall(data, "SafeERC20: low-level call failed");
        if (returndata.length > 0) {

            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

type Fixed18 is int256;
using Fixed18Lib for Fixed18 global;
type Fixed18Storage is bytes32;
using Fixed18StorageLib for Fixed18Storage global;

library Fixed18Lib {
    error Fixed18OverflowError(uint256 value);
    error Fixed18PackingOverflowError(int256 value);
    error Fixed18PackingUnderflowError(int256 value);

    int256 private constant BASE = 1e18;
    Fixed18 public constant ZERO = Fixed18.wrap(0);
    Fixed18 public constant ONE = Fixed18.wrap(BASE);
    Fixed18 public constant NEG_ONE = Fixed18.wrap(-1 * BASE);
    Fixed18 public constant MAX = Fixed18.wrap(type(int256).max);
    Fixed18 public constant MIN = Fixed18.wrap(type(int256).min);

    function from(UFixed18 a) internal pure returns (Fixed18) {
        uint256 value = UFixed18.unwrap(a);
        if (value > uint256(type(int256).max)) revert Fixed18OverflowError(value);
        return Fixed18.wrap(int256(value));
    }

    function from(int256 s, UFixed18 m) internal pure returns (Fixed18) {
        if (s > 0) return from(m);
        if (s < 0) return Fixed18.wrap(-1 * Fixed18.unwrap(from(m)));
        return ZERO;
    }

    function from(int256 a) internal pure returns (Fixed18) {
        return Fixed18.wrap(a * BASE);
    }

    function pack(Fixed18 a) internal pure returns (PackedFixed18) {
        int256 value = Fixed18.unwrap(a);
        if (value > type(int128).max) revert Fixed18PackingOverflowError(value);
        if (value < type(int128).min) revert Fixed18PackingUnderflowError(value);
        return PackedFixed18.wrap(int128(value));
    }

    function isZero(Fixed18 a) internal pure returns (bool) {
        return Fixed18.unwrap(a) == 0;
    }

    function add(Fixed18 a, Fixed18 b) internal pure returns (Fixed18) {
        return Fixed18.wrap(Fixed18.unwrap(a) + Fixed18.unwrap(b));
    }

    function sub(Fixed18 a, Fixed18 b) internal pure returns (Fixed18) {
        return Fixed18.wrap(Fixed18.unwrap(a) - Fixed18.unwrap(b));
    }

    function mul(Fixed18 a, Fixed18 b) internal pure returns (Fixed18) {
        return Fixed18.wrap(Fixed18.unwrap(a) * Fixed18.unwrap(b) / BASE);
    }

    function div(Fixed18 a, Fixed18 b) internal pure returns (Fixed18) {
        return Fixed18.wrap(Fixed18.unwrap(a) * BASE / Fixed18.unwrap(b));
    }

    function unsafeDiv(Fixed18 a, Fixed18 b) internal pure returns (Fixed18) {
        if (isZero(b)) {
            if (gt(a, ZERO)) return MAX;
            if (lt(a, ZERO)) return MIN;
            return ONE;
        } else {
            return div(a, b);
        }
    }

    function muldiv(Fixed18 a, int256 b, int256 c) internal pure returns (Fixed18) {
        return muldiv(a, Fixed18.wrap(b), Fixed18.wrap(c));
    }

    function muldiv(Fixed18 a, Fixed18 b, Fixed18 c) internal pure returns (Fixed18) {
        return Fixed18.wrap(Fixed18.unwrap(a) * Fixed18.unwrap(b) / Fixed18.unwrap(c));
    }

    function eq(Fixed18 a, Fixed18 b) internal pure returns (bool) {
        return compare(a, b) == 1;
    }

    function gt(Fixed18 a, Fixed18 b) internal pure returns (bool) {
        return compare(a, b) == 2;
    }

    function lt(Fixed18 a, Fixed18 b) internal pure returns (bool) {
        return compare(a, b) == 0;
    }

    function gte(Fixed18 a, Fixed18 b) internal pure returns (bool) {
        return gt(a, b) || eq(a, b);
    }

    function lte(Fixed18 a, Fixed18 b) internal pure returns (bool) {
        return lt(a, b) || eq(a, b);
    }

    function compare(Fixed18 a, Fixed18 b) internal pure returns (uint256) {
        (int256 au, int256 bu) = (Fixed18.unwrap(a), Fixed18.unwrap(b));
        if (au > bu) return 2;
        if (au < bu) return 0;
        return 1;
    }

    function ratio(int256 a, int256 b) internal pure returns (Fixed18) {
        return Fixed18.wrap(a * BASE / b);
    }

    function min(Fixed18 a, Fixed18 b) internal pure returns (Fixed18) {
        return Fixed18.wrap(SignedMath.min(Fixed18.unwrap(a), Fixed18.unwrap(b)));
    }

    function max(Fixed18 a, Fixed18 b) internal pure returns (Fixed18) {
        return Fixed18.wrap(SignedMath.max(Fixed18.unwrap(a), Fixed18.unwrap(b)));
    }

    function truncate(Fixed18 a) internal pure returns (int256) {
        return Fixed18.unwrap(a) / BASE;
    }

    function sign(Fixed18 a) internal pure returns (int256) {
        if (Fixed18.unwrap(a) > 0) return 1;
        if (Fixed18.unwrap(a) < 0) return -1;
        return 0;
    }

    function abs(Fixed18 a) internal pure returns (UFixed18) {
        return UFixed18.wrap(SignedMath.abs(Fixed18.unwrap(a)));
    }
}

library Fixed18StorageLib {
    function read(Fixed18Storage self) internal view returns (Fixed18 value) {
        assembly {
            value := sload(self)
        }
    }

    function store(Fixed18Storage self, Fixed18 value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

type PackedFixed18 is int128;
using PackedFixed18Lib for PackedFixed18 global;

library PackedFixed18Lib {
    PackedFixed18 public constant MAX = PackedFixed18.wrap(type(int128).max);
    PackedFixed18 public constant MIN = PackedFixed18.wrap(type(int128).min);

    function unpack(PackedFixed18 self) internal pure returns (Fixed18) {
        return Fixed18.wrap(int256(PackedFixed18.unwrap(self)));
    }
}

type PackedUFixed18 is uint128;
using PackedUFixed18Lib for PackedUFixed18 global;

library PackedUFixed18Lib {
    PackedUFixed18 public constant MAX = PackedUFixed18.wrap(type(uint128).max);

    function unpack(PackedUFixed18 self) internal pure returns (UFixed18) {
        return UFixed18.wrap(uint256(PackedUFixed18.unwrap(self)));
    }
}

type UFixed18 is uint256;
using UFixed18Lib for UFixed18 global;
type UFixed18Storage is bytes32;
using UFixed18StorageLib for UFixed18Storage global;

library UFixed18Lib {
    error UFixed18UnderflowError(int256 value);
    error UFixed18PackingOverflowError(uint256 value);

    uint256 private constant BASE = 1e18;
    UFixed18 public constant ZERO = UFixed18.wrap(0);
    UFixed18 public constant ONE = UFixed18.wrap(BASE);
    UFixed18 public constant MAX = UFixed18.wrap(type(uint256).max);

    function from(Fixed18 a) internal pure returns (UFixed18) {
        int256 value = Fixed18.unwrap(a);
        if (value < 0) revert UFixed18UnderflowError(value);
        return UFixed18.wrap(uint256(value));
    }

    function from(uint256 a) internal pure returns (UFixed18) {
        return UFixed18.wrap(a * BASE);
    }

    function pack(UFixed18 a) internal pure returns (PackedUFixed18) {
        uint256 value = UFixed18.unwrap(a);
        if (value > type(uint128).max) revert UFixed18PackingOverflowError(value);
        return PackedUFixed18.wrap(uint128(value));
    }

    function isZero(UFixed18 a) internal pure returns (bool) {
        return UFixed18.unwrap(a) == 0;
    }

    function add(UFixed18 a, UFixed18 b) internal pure returns (UFixed18) {
        return UFixed18.wrap(UFixed18.unwrap(a) + UFixed18.unwrap(b));
    }

    function sub(UFixed18 a, UFixed18 b) internal pure returns (UFixed18) {
        return UFixed18.wrap(UFixed18.unwrap(a) - UFixed18.unwrap(b));
    }

    function mul(UFixed18 a, UFixed18 b) internal pure returns (UFixed18) {
        return UFixed18.wrap(UFixed18.unwrap(a) * UFixed18.unwrap(b) / BASE);
    }

    function div(UFixed18 a, UFixed18 b) internal pure returns (UFixed18) {
        return UFixed18.wrap(UFixed18.unwrap(a) * BASE / UFixed18.unwrap(b));
    }

    function unsafeDiv(UFixed18 a, UFixed18 b) internal pure returns (UFixed18) {
        if (isZero(b)) {
            return isZero(a) ? ONE : MAX;
        } else {
            return div(a, b);
        }
    }

    function muldiv(UFixed18 a, uint256 b, uint256 c) internal pure returns (UFixed18) {
        return muldiv(a, UFixed18.wrap(b), UFixed18.wrap(c));
    }

    function muldiv(UFixed18 a, UFixed18 b, UFixed18 c) internal pure returns (UFixed18) {
        return UFixed18.wrap(UFixed18.unwrap(a) * UFixed18.unwrap(b) / UFixed18.unwrap(c));
    }

    function eq(UFixed18 a, UFixed18 b) internal pure returns (bool) {
        return compare(a, b) == 1;
    }

    function gt(UFixed18 a, UFixed18 b) internal pure returns (bool) {
        return compare(a, b) == 2;
    }

    function lt(UFixed18 a, UFixed18 b) internal pure returns (bool) {
        return compare(a, b) == 0;
    }

    function gte(UFixed18 a, UFixed18 b) internal pure returns (bool) {
        return gt(a, b) || eq(a, b);
    }

    function lte(UFixed18 a, UFixed18 b) internal pure returns (bool) {
        return lt(a, b) || eq(a, b);
    }

    function compare(UFixed18 a, UFixed18 b) internal pure returns (uint256) {
        (uint256 au, uint256 bu) = (UFixed18.unwrap(a), UFixed18.unwrap(b));
        if (au > bu) return 2;
        if (au < bu) return 0;
        return 1;
    }

    function ratio(uint256 a, uint256 b) internal pure returns (UFixed18) {
        return UFixed18.wrap(a * BASE / b);
    }

    function min(UFixed18 a, UFixed18 b) internal pure returns (UFixed18) {
        return UFixed18.wrap(Math.min(UFixed18.unwrap(a), UFixed18.unwrap(b)));
    }

    function max(UFixed18 a, UFixed18 b) internal pure returns (UFixed18) {
        return UFixed18.wrap(Math.max(UFixed18.unwrap(a), UFixed18.unwrap(b)));
    }

    function truncate(UFixed18 a) internal pure returns (uint256) {
        return UFixed18.unwrap(a) / BASE;
    }
}

library UFixed18StorageLib {
    function read(UFixed18Storage self) internal view returns (UFixed18 value) {
        assembly {
            value := sload(self)
        }
    }

    function store(UFixed18Storage self, UFixed18 value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

library CurveMath {
    error CurveMathOutOfBoundsError();

    function linearInterpolation(
        UFixed18 startX,
        Fixed18 startY,
        UFixed18 endX,
        Fixed18 endY,
        UFixed18 targetX
    ) internal pure returns (Fixed18) {
        if (targetX.lt(startX) || targetX.gt(endX)) revert CurveMathOutOfBoundsError();

        UFixed18 xRange = endX.sub(startX);
        Fixed18 yRange = endY.sub(startY);
        UFixed18 xRatio = targetX.sub(startX).div(xRange);
        return yRange.mul(Fixed18Lib.from(xRatio)).add(startY);
    }
}

interface IBatcher {
    function wrap(UFixed18 amount, address receiver) external;
    function unwrap(UFixed18 amount, address receiver) external;
}

interface IContractPayoffProvider {
    function payoff(Fixed18 price) external view returns (Fixed18 payoff);
}

interface IEmptySetReserve {
    function mint(UFixed18 amount) external;
    function redeem(UFixed18 amount) external;
}

interface IOracleProvider {

    error InvalidOracleRound();

    struct OracleVersion {

        uint256 version;

        uint256 timestamp;

        Fixed18 price;
    }

    function sync() external returns (OracleVersion memory);
    function currentVersion() external view returns (OracleVersion memory);
    function atVersion(uint256 oracleVersion) external view returns (OracleVersion memory);
}

struct PendingFeeUpdates {
    bool makerFeeUpdated;
    uint64 pendingMakerFee;
    bool takerFeeUpdated;
    uint64 pendingTakerFee;
    bool positionFeeUpdated;
    uint64 pendingPositionFee;
}
using PendingFeeUpdatesLib for PendingFeeUpdates global;
type PendingFeeUpdatesStorage is bytes32;
using PendingFeeUpdatesStorageLib for PendingFeeUpdatesStorage global;

library PendingFeeUpdatesLib {
    error PendingFeeUpdatesUnsupportedValue(UFixed18 value);

    function updateMakerFee(PendingFeeUpdates memory self, UFixed18 newMakerFee) internal pure {
        if (UFixed18.unwrap(newMakerFee) > type(uint64).max) revert PendingFeeUpdatesUnsupportedValue(newMakerFee);
        self.pendingMakerFee = uint64(UFixed18.unwrap(newMakerFee));
        self.makerFeeUpdated = true;
    }

    function makerFee(PendingFeeUpdates memory self) internal pure returns (UFixed18) {
        return UFixed18.wrap(uint256(self.pendingMakerFee));
    }

    function updateTakerFee(PendingFeeUpdates memory self, UFixed18 newTakerFee) internal pure {
        if (UFixed18.unwrap(newTakerFee) > type(uint64).max) revert PendingFeeUpdatesUnsupportedValue(newTakerFee);
        self.pendingTakerFee = uint64(UFixed18.unwrap(newTakerFee));
        self.takerFeeUpdated = true;
    }

    function takerFee(PendingFeeUpdates memory self) internal pure returns (UFixed18) {
        return UFixed18.wrap(uint256(self.pendingTakerFee));
    }

    function updatePositionFee(PendingFeeUpdates memory self, UFixed18 newPositionFee) internal pure {
        if (UFixed18.unwrap(newPositionFee) > type(uint64).max) revert PendingFeeUpdatesUnsupportedValue(newPositionFee);
        self.pendingPositionFee = uint64(UFixed18.unwrap(newPositionFee));
        self.positionFeeUpdated = true;
    }

    function positionFee(PendingFeeUpdates memory self) internal pure returns (UFixed18) {
        return UFixed18.wrap(uint256(self.pendingPositionFee));
    }

    function hasUpdates(PendingFeeUpdates memory self) internal pure returns (bool) {
        return self.makerFeeUpdated || self.takerFeeUpdated || self.positionFeeUpdated;
    }

    function clear(PendingFeeUpdates memory self) internal pure {
        self.makerFeeUpdated = false;
        self.pendingMakerFee = 0;
        self.takerFeeUpdated = false;
        self.pendingTakerFee = 0;
        self.positionFeeUpdated = false;
        self.pendingPositionFee = 0;
    }
}

library PendingFeeUpdatesStorageLib {
    struct PendingFeeUpdatesStoragePointer {
        PendingFeeUpdates value;
    }

    function read(PendingFeeUpdatesStorage self) internal view returns (PendingFeeUpdates memory) {
        return _storagePointer(self).value;
    }

    function store(PendingFeeUpdatesStorage self, PendingFeeUpdates memory value) internal {
        _storagePointer(self).value = value;
    }

    function _storagePointer(
        PendingFeeUpdatesStorage self
    ) private pure returns (PendingFeeUpdatesStoragePointer storage pointer) {

        assembly { pointer.slot := self }
    }
}

type BoolStorage is bytes32;
using BoolStorageLib for BoolStorage global;

type Uint256Storage is bytes32;
using Uint256StorageLib for Uint256Storage global;

type Int256Storage is bytes32;
using Int256StorageLib for Int256Storage global;

type AddressStorage is bytes32;
using AddressStorageLib for AddressStorage global;

type Bytes32Storage is bytes32;
using Bytes32StorageLib for Bytes32Storage global;

library BoolStorageLib {

    function read(BoolStorage self) internal view returns (bool value) {
        assembly {
            value := sload(self)
        }
    }

    function store(BoolStorage self, bool value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

library Uint256StorageLib {

    function read(Uint256Storage self) internal view returns (uint256 value) {
        assembly {
            value := sload(self)
        }
    }

    function store(Uint256Storage self, uint256 value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

library Int256StorageLib {

    function read(Int256Storage self) internal view returns (int256 value) {
        assembly {
            value := sload(self)
        }
    }

    function store(Int256Storage self, int256 value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

library AddressStorageLib {

    function read(AddressStorage self) internal view returns (address value) {
        assembly {
            value := sload(self)
        }
    }

    function store(AddressStorage self, address value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

library Bytes32StorageLib {

    function read(Bytes32Storage self) internal view returns (bytes32 value) {
        assembly {
            value := sload(self)
        }
    }

    function store(Bytes32Storage self, bytes32 value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

struct Accumulator {

    Fixed18 maker;

    Fixed18 taker;
}
using AccumulatorLib for Accumulator global;

library AccumulatorLib {

    function pack(Accumulator memory self) internal pure returns (PackedAccumulator memory) {
        return PackedAccumulator({maker: self.maker.pack(), taker: self.taker.pack()});
    }

    function add(Accumulator memory a, Accumulator memory b) internal pure returns (Accumulator memory) {
        return Accumulator({maker: a.maker.add(b.maker), taker: a.taker.add(b.taker)});
    }

    function sub(Accumulator memory a, Accumulator memory b) internal pure returns (Accumulator memory) {
        return Accumulator({maker: a.maker.sub(b.maker), taker: a.taker.sub(b.taker)});
    }

    function mul(Accumulator memory a, Accumulator memory b) internal pure returns (Accumulator memory) {
        return Accumulator({maker: a.maker.mul(b.maker), taker: a.taker.mul(b.taker)});
    }

    function sum(Accumulator memory self) internal pure returns (Fixed18) {
        return self.maker.add(self.taker);
    }
}

struct JumpRateUtilizationCurve {
    PackedFixed18 minRate;
    PackedFixed18 maxRate;
    PackedFixed18 targetRate;
    PackedUFixed18 targetUtilization;
}
using JumpRateUtilizationCurveLib for JumpRateUtilizationCurve global;
type JumpRateUtilizationCurveStorage is bytes32;
using JumpRateUtilizationCurveStorageLib for JumpRateUtilizationCurveStorage global;

library JumpRateUtilizationCurveLib {

    function compute(JumpRateUtilizationCurve memory self, UFixed18 utilization) internal pure returns (Fixed18) {
        UFixed18 targetUtilization = self.targetUtilization.unpack();
        if (utilization.lt(targetUtilization)) {
            return CurveMath.linearInterpolation(
                UFixed18Lib.ZERO,
                self.minRate.unpack(),
                targetUtilization,
                self.targetRate.unpack(),
                utilization
            );
        }
        if (utilization.lt(UFixed18Lib.ONE)) {
            return CurveMath.linearInterpolation(
                targetUtilization,
                self.targetRate.unpack(),
                UFixed18Lib.ONE,
                self.maxRate.unpack(),
                utilization
            );
        }
        return self.maxRate.unpack();
    }
}

library JumpRateUtilizationCurveStorageLib {
    function read(JumpRateUtilizationCurveStorage self) internal view returns (JumpRateUtilizationCurve memory) {
        return _storagePointer(self);
    }

    function store(JumpRateUtilizationCurveStorage self, JumpRateUtilizationCurve memory value) internal {
        JumpRateUtilizationCurve storage storagePointer = _storagePointer(self);

        storagePointer.minRate = value.minRate;
        storagePointer.maxRate = value.maxRate;
        storagePointer.targetRate = value.targetRate;
        storagePointer.targetUtilization = value.targetUtilization;
    }

    function _storagePointer(JumpRateUtilizationCurveStorage self)
    private pure returns (JumpRateUtilizationCurve storage pointer) {
        assembly { pointer.slot := self }
    }
}

struct PackedAccumulator {

    PackedFixed18 maker;

    PackedFixed18 taker;
}
using PackedAccumulatorLib for PackedAccumulator global;

library PackedAccumulatorLib {

    function unpack(PackedAccumulator memory self) internal pure returns (Accumulator memory) {
        return Accumulator({maker: self.maker.unpack(), taker: self.taker.unpack()});
    }
}

struct PayoffDefinition {
  PayoffDefinitionLib.PayoffType payoffType;
  PayoffDefinitionLib.PayoffDirection payoffDirection;
  bytes30 data;
}
using PayoffDefinitionLib for PayoffDefinition global;
type PayoffDefinitionStorage is bytes32;
using PayoffDefinitionStorageLib for PayoffDefinitionStorage global;

library PayoffDefinitionLib {
  using Address for address;

  error PayoffDefinitionUnsupportedTransform(PayoffType payoffType, PayoffDirection payoffDirection);
  error PayoffDefinitionNotContract(PayoffType payoffType, bytes30 data);

  enum PayoffType { PASSTHROUGH, CONTRACT }
  enum PayoffDirection { LONG, SHORT }

  function valid(PayoffDefinition memory self) internal view returns (bool) {
    if (self.payoffType == PayoffType.CONTRACT) return address(_providerContract(self)).isContract();

    return uint(bytes32(self.data)) == 0;
  }

  function transform(
    PayoffDefinition memory self,
    Fixed18 price
  ) internal view returns (Fixed18) {
    PayoffType payoffType = self.payoffType;
    PayoffDirection payoffDirection = self.payoffDirection;
    Fixed18 transformedPrice;

    if (payoffType == PayoffType.PASSTHROUGH) transformedPrice = price;
    else if (payoffType == PayoffType.CONTRACT) transformedPrice =  _payoffFromContract(self, price);
    else revert PayoffDefinitionUnsupportedTransform(payoffType, payoffDirection);

    if (self.payoffDirection == PayoffDirection.LONG) return transformedPrice;
    else if (self.payoffDirection == PayoffDirection.SHORT) return transformedPrice.mul(Fixed18Lib.NEG_ONE);
    else revert PayoffDefinitionUnsupportedTransform(payoffType, payoffDirection);
  }

  function _providerContract(
    PayoffDefinition memory self
  ) private pure returns (IContractPayoffProvider) {
    if (self.payoffType != PayoffType.CONTRACT) revert PayoffDefinitionNotContract(self.payoffType, self.data);

    return IContractPayoffProvider(address(bytes20(self.data << 80)));
  }

  function _payoffFromContract(
    PayoffDefinition memory self,
    Fixed18 price
  ) private view returns (Fixed18) {
    bytes memory ret = address(_providerContract(self)).functionStaticCall(
      abi.encodeCall(IContractPayoffProvider.payoff, price)
    );
    return Fixed18.wrap(abi.decode(ret, (int256)));
  }
}

library PayoffDefinitionStorageLib {
    function read(PayoffDefinitionStorage self) internal view returns (PayoffDefinition memory) {
        return _storagePointer(self);
    }

    function store(PayoffDefinitionStorage self, PayoffDefinition memory value) internal {
        PayoffDefinition storage storagePointer = _storagePointer(self);

        storagePointer.payoffType = value.payoffType;
        storagePointer.payoffDirection = value.payoffDirection;
        storagePointer.data = value.data;
    }

    function _storagePointer(
      PayoffDefinitionStorage self
    ) private pure returns (PayoffDefinition storage pointer) {
        assembly { pointer.slot := self }
    }
}

abstract contract UInitializable {
    error UInitializableZeroVersionError();
    error UInitializableAlreadyInitializedError(uint256 version);
    error UInitializableNotInitializingError();

    event Initialized(uint256 version);

    Uint256Storage private constant _version = Uint256Storage.wrap(keccak256("equilibria.root.UInitializable.version"));

    BoolStorage private constant _initializing = BoolStorage.wrap(keccak256("equilibria.root.UInitializable.initializing"));

    modifier initializer(uint256 version) {
        if (version == 0) revert UInitializableZeroVersionError();
        if (_version.read() >= version) revert UInitializableAlreadyInitializedError(version);

        _version.store(version);
        _initializing.store(true);

        _;

        _initializing.store(false);
        emit Initialized(version);
    }

    modifier onlyInitializer() {
        if (!_constructing() && !_initializing.read()) revert UInitializableNotInitializingError();
        _;
    }

    function _constructing() private view returns (bool) {
        return !Address.isContract(address(this));
    }
}

interface IParamProvider {
    event MaintenanceUpdated(UFixed18 newMaintenance, uint256 version);
    event FundingFeeUpdated(UFixed18 newFundingFee, uint256 version);
    event MakerFeeUpdated(UFixed18 newMakerFee, uint256 version);
    event PendingMakerFeeUpdated(UFixed18 newMakerFee);
    event TakerFeeUpdated(UFixed18 newTakerFee, uint256 version);
    event PendingTakerFeeUpdated(UFixed18 newTakerFee);
    event PositionFeeUpdated(UFixed18 newPositionFee, uint256 version);
    event PendingPositionFeeUpdated(UFixed18 newPositionFee);
    event MakerLimitUpdated(UFixed18 newMakerLimit, uint256 version);
    event JumpRateUtilizationCurveUpdated(
        JumpRateUtilizationCurve,
        uint256 version
    );

    error ParamProviderInvalidParamValue();

    function maintenance() external view returns (UFixed18);
    function updateMaintenance(UFixed18 newMaintenance) external;
    function fundingFee() external view returns (UFixed18);
    function updateFundingFee(UFixed18 newFundingFee) external;
    function makerFee() external view returns (UFixed18);
    function updateMakerFee(UFixed18 newMakerFee) external;
    function takerFee() external view returns (UFixed18);
    function updateTakerFee(UFixed18 newTakerFee) external;
    function positionFee() external view returns (UFixed18);
    function updatePositionFee(UFixed18 newPositionFee) external;
    function makerLimit() external view returns (UFixed18);
    function updateMakerLimit(UFixed18 newMakerLimit) external;
    function utilizationCurve() external view returns (JumpRateUtilizationCurve memory);
    function updateUtilizationCurve(JumpRateUtilizationCurve memory newUtilizationCurve) external;
    function pendingFeeUpdates() external view returns (PendingFeeUpdates memory);
}

abstract contract UReentrancyGuard is UInitializable {
    error UReentrancyGuardReentrantCallError();

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    Uint256Storage private constant _status = Uint256Storage.wrap(keccak256("equilibria.root.UReentrancyGuard.status"));

    function __UReentrancyGuard__initialize() internal onlyInitializer {
        _status.store(_NOT_ENTERED);
    }

    modifier nonReentrant() {

        if (_status.read() == _ENTERED) revert UReentrancyGuardReentrantCallError();

        _status.store(_ENTERED);

        _;

        _status.store(_NOT_ENTERED);
    }
}

interface IPayoffProvider {
    event OracleUpdated(address newOracle, uint256 oracleVersion);

    error PayoffProviderInvalidOracle();
    error PayoffProviderInvalidPayoffDefinitionError();

    function oracle() external view returns (IOracleProvider);
    function payoffDefinition() external view returns (PayoffDefinition memory);
    function currentVersion() external view returns (IOracleProvider.OracleVersion memory);
    function atVersion(uint256 oracleVersion) external view returns (IOracleProvider.OracleVersion memory);
}

type Token18 is address;
using Token18Lib for Token18 global;
type Token18Storage is bytes32;
using Token18StorageLib for Token18Storage global;

library Token18Lib {
    using SafeERC20 for IERC20;

    Token18 public constant ZERO = Token18.wrap(address(0));

    function isZero(Token18 self) internal pure returns (bool) {
        return Token18.unwrap(self) == Token18.unwrap(ZERO);
    }

    function eq(Token18 a, Token18 b) internal pure returns (bool) {
        return Token18.unwrap(a) ==  Token18.unwrap(b);
    }

    function approve(Token18 self, address grantee) internal {
        IERC20(Token18.unwrap(self)).safeApprove(grantee, type(uint256).max);
    }

    function approve(Token18 self, address grantee, UFixed18 amount) internal {
        IERC20(Token18.unwrap(self)).safeApprove(grantee, UFixed18.unwrap(amount));
    }

    function push(Token18 self, address recipient) internal {
        push(self, recipient, balanceOf(self, address(this)));
    }

    function push(Token18 self, address recipient, UFixed18 amount) internal {
        IERC20(Token18.unwrap(self)).safeTransfer(recipient, UFixed18.unwrap(amount));
    }

    function pull(Token18 self, address benefactor, UFixed18 amount) internal {
        IERC20(Token18.unwrap(self)).safeTransferFrom(benefactor, address(this), UFixed18.unwrap(amount));
    }

    function pullTo(Token18 self, address benefactor, address recipient, UFixed18 amount) internal {
        IERC20(Token18.unwrap(self)).safeTransferFrom(benefactor, recipient, UFixed18.unwrap(amount));
    }

    function name(Token18 self) internal view returns (string memory) {
        return IERC20Metadata(Token18.unwrap(self)).name();
    }

    function symbol(Token18 self) internal view returns (string memory) {
        return IERC20Metadata(Token18.unwrap(self)).symbol();
    }

    function balanceOf(Token18 self) internal view returns (UFixed18) {
        return balanceOf(self, address(this));
    }

    function balanceOf(Token18 self, address account) internal view returns (UFixed18) {
        return UFixed18.wrap(IERC20(Token18.unwrap(self)).balanceOf(account));
    }
}

library Token18StorageLib {
    function read(Token18Storage self) internal view returns (Token18 value) {
        assembly {
            value := sload(self)
        }
    }

    function store(Token18Storage self, Token18 value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

type Token6 is address;
using Token6Lib for Token6 global;
type Token6Storage is bytes32;
using Token6StorageLib for Token6Storage global;

library Token6Lib {
    using SafeERC20 for IERC20;

    Token6 public constant ZERO = Token6.wrap(address(0));

    uint256 private constant OFFSET = 1e12;

    function isZero(Token6 self) internal pure returns (bool) {
        return Token6.unwrap(self) == Token6.unwrap(ZERO);
    }

    function eq(Token6 a, Token6 b) internal pure returns (bool) {
        return Token6.unwrap(a) ==  Token6.unwrap(b);
    }

    function approve(Token6 self, address grantee) internal {
        IERC20(Token6.unwrap(self)).safeApprove(grantee, type(uint256).max);
    }

    function approve(Token6 self, address grantee, UFixed18 amount) internal {
        IERC20(Token6.unwrap(self)).safeApprove(grantee, toTokenAmount(amount, false));
    }

    function approve(Token6 self, address grantee, UFixed18 amount, bool roundUp) internal {
        IERC20(Token6.unwrap(self)).safeApprove(grantee, toTokenAmount(amount, roundUp));
    }

    function push(Token6 self, address recipient) internal {
        push(self, recipient, balanceOf(self, address(this)));
    }

    function push(Token6 self, address recipient, UFixed18 amount) internal {
        IERC20(Token6.unwrap(self)).safeTransfer(recipient, toTokenAmount(amount, false));
    }

    function push(Token6 self, address recipient, UFixed18 amount, bool roundUp) internal {
        IERC20(Token6.unwrap(self)).safeTransfer(recipient, toTokenAmount(amount, roundUp));
    }

    function pull(Token6 self, address benefactor, UFixed18 amount) internal {
        IERC20(Token6.unwrap(self)).safeTransferFrom(benefactor, address(this), toTokenAmount(amount, false));
    }

    function pull(Token6 self, address benefactor, UFixed18 amount, bool roundUp) internal {
        IERC20(Token6.unwrap(self)).safeTransferFrom(benefactor, address(this), toTokenAmount(amount, roundUp));
    }

    function pullTo(Token6 self, address benefactor, address recipient, UFixed18 amount) internal {
        IERC20(Token6.unwrap(self)).safeTransferFrom(benefactor, recipient, toTokenAmount(amount, false));
    }

    function pullTo(Token6 self, address benefactor, address recipient, UFixed18 amount, bool roundUp) internal {
        IERC20(Token6.unwrap(self)).safeTransferFrom(benefactor, recipient, toTokenAmount(amount, roundUp));
    }

    function name(Token6 self) internal view returns (string memory) {
        return IERC20Metadata(Token6.unwrap(self)).name();
    }

    function symbol(Token6 self) internal view returns (string memory) {
        return IERC20Metadata(Token6.unwrap(self)).symbol();
    }

    function balanceOf(Token6 self) internal view returns (UFixed18) {
        return balanceOf(self, address(this));
    }

    function balanceOf(Token6 self, address account) internal view returns (UFixed18) {
        return fromTokenAmount(IERC20(Token6.unwrap(self)).balanceOf(account));
    }

    function toTokenAmount(UFixed18 amount, bool roundUp) private pure returns (uint256) {
        return roundUp ? Math.ceilDiv(UFixed18.unwrap(amount), OFFSET) : UFixed18.unwrap(amount) / OFFSET;
    }

    function fromTokenAmount(uint256 amount) private pure returns (UFixed18) {
        return UFixed18.wrap(amount * OFFSET);
    }
}

library Token6StorageLib {
    function read(Token6Storage self) internal view returns (Token6 value) {
        assembly {
            value := sload(self)
        }
    }

    function store(Token6Storage self, Token6 value) internal {
        assembly {
            sstore(self, value)
        }
    }
}

abstract contract UPayoffProvider is IPayoffProvider, UInitializable {

    AddressStorage private constant _oracle =
        AddressStorage.wrap(keccak256("equilibria.perennial.UPayoffProvider.oracle"));
    function oracle() public view returns (IOracleProvider) { return IOracleProvider(_oracle.read()); }

    PayoffDefinitionStorage private constant _payoffDefinition =
        PayoffDefinitionStorage.wrap(keccak256("equilibria.perennial.UPayoffProvider.payoffDefinition"));
    function payoffDefinition() public view returns (PayoffDefinition memory) { return _payoffDefinition.read(); }

    function __UPayoffProvider__initialize(IOracleProvider oracle_, PayoffDefinition calldata payoffDefinition_) internal onlyInitializer {
        _updateOracle(address(oracle_), 0);

        if (!payoffDefinition_.valid()) revert PayoffProviderInvalidPayoffDefinitionError();
        _payoffDefinition.store(payoffDefinition_);
    }

    function currentVersion() public view returns (IOracleProvider.OracleVersion memory) {
        return _transform(oracle().currentVersion());
    }

    function atVersion(uint256 oracleVersion) public view returns (IOracleProvider.OracleVersion memory) {
        return _transform(oracle().atVersion(oracleVersion));
    }

    function _updateOracle(address newOracle, uint256 oracleVersion) internal {
        if (!Address.isContract(newOracle)) revert PayoffProviderInvalidOracle();
        _oracle.store(newOracle);

        emit OracleUpdated(newOracle, oracleVersion);
    }

    function _sync() internal returns (IOracleProvider.OracleVersion memory) {
        return _transform(oracle().sync());
    }

    function _transform(IOracleProvider.OracleVersion memory oracleVersion)
    internal view virtual returns (IOracleProvider.OracleVersion memory) {
        oracleVersion.price = payoffDefinition().transform(oracleVersion.price);
        return oracleVersion;
    }
}

interface IProduct is IPayoffProvider, IParamProvider {

    struct ProductInfo {

        string name;

        string symbol;

        PayoffDefinition payoffDefinition;

        IOracleProvider oracle;

        UFixed18 maintenance;

        UFixed18 fundingFee;

        UFixed18 makerFee;

        UFixed18 takerFee;

        UFixed18 positionFee;

        UFixed18 makerLimit;

        JumpRateUtilizationCurve utilizationCurve;
    }

    event Settle(uint256 preVersion, uint256 toVersion);
    event AccountSettle(address indexed account, uint256 preVersion, uint256 toVersion);
    event MakeOpened(address indexed account, uint256 version, UFixed18 amount);
    event TakeOpened(address indexed account, uint256 version, UFixed18 amount);
    event MakeClosed(address indexed account, uint256 version, UFixed18 amount);
    event TakeClosed(address indexed account, uint256 version, UFixed18 amount);
    event ClosedUpdated(bool indexed newClosed, uint256 version);
    event PositionFeeCharged(address indexed account, uint256 version, UFixed18 positionFee);

    error ProductInsufficientLiquidityError(UFixed18 socializationFactor);
    error ProductDoubleSidedError();
    error ProductOverClosedError();
    error ProductInsufficientCollateralError();
    error ProductInLiquidationError();
    error ProductMakerOverLimitError();
    error ProductOracleBootstrappingError();
    error ProductClosedError();

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function initialize(ProductInfo calldata productInfo_) external;
    function settle() external;
    function settleAccount(address account) external;
    function openTake(UFixed18 amount) external;
    function openTakeFor(address account, UFixed18 amount) external;
    function closeTake(UFixed18 amount) external;
    function closeTakeFor(address account, UFixed18 amount) external;
    function openMake(UFixed18 amount) external;
    function openMakeFor(address account, UFixed18 amount) external;
    function closeMake(UFixed18 amount) external;
    function closeMakeFor(address account, UFixed18 amount) external;
    function closeAll(address account) external;
    function maintenance(address account) external view returns (UFixed18);
    function maintenanceNext(address account) external view returns (UFixed18);
    function isClosed(address account) external view returns (bool);
    function isLiquidating(address account) external view returns (bool);
    function position(address account) external view returns (Position memory);
    function pre(address account) external view returns (PrePosition memory);
    function latestVersion() external view returns (uint256);
    function positionAtVersion(uint256 oracleVersion) external view returns (Position memory);
    function pre() external view returns (PrePosition memory);
    function valueAtVersion(uint256 oracleVersion) external view returns (Accumulator memory);
    function shareAtVersion(uint256 oracleVersion) external view returns (Accumulator memory);
    function latestVersion(address account) external view returns (uint256);
    function rate(Position memory position) external view returns (Fixed18);
    function closed() external view returns (bool);
    function updateClosed(bool newClosed) external;
    function updateOracle(IOracleProvider newOracle) external;
}

struct PackedPosition {

    PackedUFixed18 maker;

    PackedUFixed18 taker;
}
using PackedPositionLib for PackedPosition global;

library PackedPositionLib {

    function unpack(PackedPosition memory self) internal pure returns (Position memory) {
        return Position({maker: self.maker.unpack(), taker: self.taker.unpack()});
    }
}

struct Position {

    UFixed18 maker;

    UFixed18 taker;
}
using PositionLib for Position global;

library PositionLib {

    function pack(Position memory self) internal pure returns (PackedPosition memory) {
        return PackedPosition({maker: self.maker.pack(), taker: self.taker.pack()});
    }

    function isEmpty(Position memory self) internal pure returns (bool) {
        return self.maker.isZero() && self.taker.isZero();
    }

    function add(Position memory a, Position memory b) internal pure returns (Position memory) {
        return Position({maker: a.maker.add(b.maker), taker: a.taker.add(b.taker)});
    }

    function sub(Position memory a, Position memory b) internal pure returns (Position memory) {
        return Position({maker: a.maker.sub(b.maker), taker: a.taker.sub(b.taker)});
    }

    function mul(Position memory self, Accumulator memory accumulator) internal pure returns (Accumulator memory) {
        return Accumulator({
            maker: Fixed18Lib.from(self.maker).mul(accumulator.maker),
            taker: Fixed18Lib.from(self.taker).mul(accumulator.taker)
        });
    }

    function mul(Position memory self, UFixed18 scale) internal pure returns (Position memory) {
        return Position({maker: self.maker.mul(scale), taker: self.taker.mul(scale)});
    }

    function div(Position memory self, uint256 b) internal pure returns (Accumulator memory) {
        return Accumulator({
            maker: Fixed18Lib.from(self.maker).div(Fixed18Lib.from(UFixed18Lib.from(b))),
            taker: Fixed18Lib.from(self.taker).div(Fixed18Lib.from(UFixed18Lib.from(b)))
        });
    }

    function max(Position memory self) internal pure returns (UFixed18) {
        return UFixed18Lib.max(self.maker, self.taker);
    }

    function sum(Position memory self) internal pure returns (UFixed18) {
        return self.maker.add(self.taker);
    }

    function next(Position memory self, PrePosition memory pre) internal pure returns (Position memory) {
        return sub(add(self, pre.openPosition), pre.closePosition);
    }

    function settled(
        Position memory self,
        PrePosition memory pre,
        IOracleProvider.OracleVersion memory toOracleVersion
    ) internal pure returns (Position memory, bool) {
        return pre.canSettle(toOracleVersion) ? (next(self, pre), true) : (self, false);
    }

    function socializationFactor(Position memory self) internal pure returns (UFixed18) {
        return self.taker.isZero() ? UFixed18Lib.ONE : UFixed18Lib.min(UFixed18Lib.ONE, self.maker.div(self.taker));
    }
}

struct PrePosition {

    uint256 oracleVersion;

    Position openPosition;

    Position closePosition;
}
using PrePositionLib for PrePosition global;

library PrePositionLib {

    function isEmpty(PrePosition memory self) internal pure returns (bool) {
        return self.openPosition.isEmpty() && self.closePosition.isEmpty();
    }

    function openMake(PrePosition storage self, uint256 currentVersion, UFixed18 amount) internal {
        self.openPosition.maker = self.openPosition.maker.add(amount);
        self.oracleVersion = currentVersion;
    }

    function closeMake(PrePosition storage self, uint256 currentVersion, UFixed18 amount) internal {
        self.closePosition.maker = self.closePosition.maker.add(amount);
        self.oracleVersion = currentVersion;
    }

    function openTake(PrePosition storage self, uint256 currentVersion, UFixed18 amount) internal {
        self.openPosition.taker = self.openPosition.taker.add(amount);
        self.oracleVersion = currentVersion;
    }

    function closeTake(PrePosition storage self, uint256 currentVersion, UFixed18 amount) internal {
        self.closePosition.taker = self.closePosition.taker.add(amount);
        self.oracleVersion = currentVersion;
    }

    function canSettle(
        PrePosition memory self,
        IOracleProvider.OracleVersion memory toOracleVersion
    ) internal pure returns (bool) {
        return self.oracleVersion != 0 && toOracleVersion.version > self.oracleVersion;
    }

    function computeFee(
        PrePosition memory self,
        IOracleProvider.OracleVersion memory latestOracleVersion
    ) internal view returns (Position memory) {
        Position memory positionDelta = self.openPosition.add(self.closePosition);

        (UFixed18 makerNotional, UFixed18 takerNotional) = (
            Fixed18Lib.from(positionDelta.maker).mul(latestOracleVersion.price).abs(),
            Fixed18Lib.from(positionDelta.taker).mul(latestOracleVersion.price).abs()
        );

        IProduct product = IProduct(address(this));
        return Position(makerNotional.mul(product.makerFee()), takerNotional.mul(product.takerFee()));
    }

    function settleVersion(PrePosition storage self, uint256 currentVersion) internal view returns (uint256) {
        uint256 _oracleVersion = self.oracleVersion;
        return _oracleVersion == 0 ? currentVersion : _oracleVersion + 1;
    }
}

struct AccountPosition {

    Position position;

    PrePosition pre;

    bool liquidation;
}
using AccountPositionLib for AccountPosition global;

library AccountPositionLib {

    function settle(
        AccountPosition storage self,
        IOracleProvider.OracleVersion memory toOracleVersion
    ) internal {
        bool settled;
        (self.position, settled) = self.position.settled(self.pre, toOracleVersion);
        if (settled) {
            delete self.pre;
            self.liquidation = false;
        }
    }

    function maintenance(AccountPosition storage self) internal view returns (UFixed18) {
        return _maintenance(self.position);
    }

    function maintenanceNext(AccountPosition storage self) internal view returns (UFixed18) {
        return _maintenance(self.position.next(self.pre));
    }

    function _maintenance(Position memory position) private view returns (UFixed18) {
        IProduct product = IProduct(address(this));
        Fixed18 oraclePrice = product.currentVersion().price;
        UFixed18 notionalMax = Fixed18Lib.from(position.max()).mul(oraclePrice).abs();
        return notionalMax.mul(product.maintenance());
    }

    function isClosed(AccountPosition memory self) internal pure returns (bool) {
        return self.pre.isEmpty() && self.position.isEmpty();
    }

    function isDoubleSided(AccountPosition storage self) internal view returns (bool) {
        bool makerEmpty = self.position.maker.isZero() && self.pre.openPosition.maker.isZero() && self.pre.closePosition.maker.isZero();
        bool takerEmpty = self.position.taker.isZero() && self.pre.openPosition.taker.isZero() && self.pre.closePosition.taker.isZero();

        return !makerEmpty && !takerEmpty;
    }

    function isOverClosed(AccountPosition storage self) internal view returns (bool) {
        Position memory nextOpen = self.position.add(self.pre.openPosition);

        return  self.pre.closePosition.maker.gt(nextOpen.maker) || self.pre.closePosition.taker.gt(nextOpen.taker);
    }
}

struct VersionedPosition {

    mapping(uint256 => PackedPosition) _positionAtVersion;

    PrePosition pre;
}
using VersionedPositionLib for VersionedPosition global;

library VersionedPositionLib {

    function positionAtVersion(VersionedPosition storage self, uint256 oracleVersion) internal view returns (Position memory) {
        return self._positionAtVersion[oracleVersion].unpack();
    }

    function settle(
        VersionedPosition storage self,
        uint256 latestVersion,
        IOracleProvider.OracleVersion memory toOracleVersion
    ) internal {
        (Position memory newPosition, bool settled) =
            positionAtVersion(self, latestVersion).settled(self.pre, toOracleVersion);

        self._positionAtVersion[toOracleVersion.version] = newPosition.pack();
        if (settled) delete self.pre;
    }
}

struct VersionedAccumulator {

    uint256 latestVersion;

    mapping(uint256 => PackedAccumulator) _valueAtVersion;

    mapping(uint256 => PackedAccumulator) _shareAtVersion;
}
using VersionedAccumulatorLib for VersionedAccumulator global;

library VersionedAccumulatorLib {

    function valueAtVersion(VersionedAccumulator storage self, uint256 oracleVersion) internal view returns (Accumulator memory) {
        return self._valueAtVersion[oracleVersion].unpack();
    }

    function shareAtVersion(VersionedAccumulator storage self, uint256 oracleVersion) internal view returns (Accumulator memory) {
        return self._shareAtVersion[oracleVersion].unpack();
    }

    function accumulate(
        VersionedAccumulator storage self,
        UFixed18 fundingFee,
        VersionedPosition storage position,
        IOracleProvider.OracleVersion memory latestOracleVersion,
        IOracleProvider.OracleVersion memory toOracleVersion
    ) internal returns (UFixed18 accumulatedFee) {
        Position memory latestPosition = position.positionAtVersion(latestOracleVersion.version);

        Accumulator memory accumulatedPosition;
        (accumulatedPosition, accumulatedFee) =
            _accumulateFunding(fundingFee, latestPosition, latestOracleVersion, toOracleVersion);

        accumulatedPosition = accumulatedPosition.add(
            _accumulatePosition(latestPosition, latestOracleVersion, toOracleVersion));

        (Accumulator memory accumulatedPositionFee, UFixed18 protocolPositionFee) =
            _accumulatePositionFee(latestPosition, position.pre, latestOracleVersion);
        accumulatedPosition = accumulatedPosition.add(accumulatedPositionFee);
        accumulatedFee = accumulatedFee.add(protocolPositionFee);

        Accumulator memory accumulatedShare =
            _accumulateShare(latestPosition, latestOracleVersion, toOracleVersion);

        self._valueAtVersion[toOracleVersion.version] = valueAtVersion(self, latestOracleVersion.version)
            .add(accumulatedPosition)
            .pack();
        self._shareAtVersion[toOracleVersion.version] = shareAtVersion(self, latestOracleVersion.version)
            .add(accumulatedShare)
            .pack();
        self.latestVersion = toOracleVersion.version;
    }

    function _accumulateFunding(
        UFixed18 fundingFee,
        Position memory latestPosition,
        IOracleProvider.OracleVersion memory latestOracleVersion,
        IOracleProvider.OracleVersion memory toOracleVersion
    ) private view returns (Accumulator memory accumulatedFunding, UFixed18 accumulatedFee) {
        if (_product().closed()) return (Accumulator(Fixed18Lib.ZERO, Fixed18Lib.ZERO), UFixed18Lib.ZERO);
        if (latestPosition.taker.isZero()) return (Accumulator(Fixed18Lib.ZERO, Fixed18Lib.ZERO), UFixed18Lib.ZERO);
        if (latestPosition.maker.isZero()) return (Accumulator(Fixed18Lib.ZERO, Fixed18Lib.ZERO), UFixed18Lib.ZERO);

        uint256 elapsed = toOracleVersion.timestamp - latestOracleVersion.timestamp;

        UFixed18 takerNotional = Fixed18Lib.from(latestPosition.taker).mul(latestOracleVersion.price).abs();
        UFixed18 socializedNotional = takerNotional.mul(latestPosition.socializationFactor());

        Fixed18 rateAccumulated = _product().rate(latestPosition)
            .mul(Fixed18Lib.from(UFixed18Lib.from(elapsed)));
        Fixed18 fundingAccumulated = rateAccumulated.mul(Fixed18Lib.from(socializedNotional));
        accumulatedFee = fundingAccumulated.abs().mul(fundingFee);

        Fixed18 fundingAccumulatedWithoutFee = Fixed18Lib.from(
            fundingAccumulated.sign(),
            fundingAccumulated.abs().sub(accumulatedFee)
        );

        bool makerPaysFunding = fundingAccumulated.sign() < 0;
        accumulatedFunding.maker = (makerPaysFunding ? fundingAccumulated : fundingAccumulatedWithoutFee)
            .div(Fixed18Lib.from(latestPosition.maker));
        accumulatedFunding.taker = (makerPaysFunding ? fundingAccumulatedWithoutFee : fundingAccumulated)
            .div(Fixed18Lib.from(latestPosition.taker)).mul(Fixed18Lib.NEG_ONE);
    }

    function _accumulatePosition(
        Position memory latestPosition,
        IOracleProvider.OracleVersion memory latestOracleVersion,
        IOracleProvider.OracleVersion memory toOracleVersion
    ) private view returns (Accumulator memory accumulatedPosition) {
        if (_product().closed()) return Accumulator(Fixed18Lib.ZERO, Fixed18Lib.ZERO);
        if (latestPosition.taker.isZero()) return Accumulator(Fixed18Lib.ZERO, Fixed18Lib.ZERO);
        if (latestPosition.maker.isZero()) return Accumulator(Fixed18Lib.ZERO, Fixed18Lib.ZERO);

        Fixed18 oracleDelta = toOracleVersion.price.sub(latestOracleVersion.price);
        Fixed18 totalTakerDelta = oracleDelta.mul(Fixed18Lib.from(latestPosition.taker));
        Fixed18 socializedTakerDelta = totalTakerDelta.mul(Fixed18Lib.from(latestPosition.socializationFactor()));

        accumulatedPosition.maker = socializedTakerDelta.div(Fixed18Lib.from(latestPosition.maker)).mul(Fixed18Lib.NEG_ONE);
        accumulatedPosition.taker = socializedTakerDelta.div(Fixed18Lib.from(latestPosition.taker));
    }

    function _accumulatePositionFee(
        Position memory latestPosition,
        PrePosition memory pre,
        IOracleProvider.OracleVersion memory latestOracleVersion
    ) private view returns (Accumulator memory accumulatedPosition, UFixed18 fee) {
        if (pre.isEmpty()) return (accumulatedPosition, fee);

        Position memory positionFee = pre.computeFee(latestOracleVersion);
        Position memory protocolFee = positionFee.mul(_product().positionFee());
        positionFee = positionFee.sub(protocolFee);
        fee = protocolFee.sum();

        if (!latestPosition.maker.isZero()) {
            accumulatedPosition.maker = Fixed18Lib.from(positionFee.taker.div(latestPosition.maker));
        } else {
            fee = fee.add(positionFee.taker);
        }

        if (!latestPosition.taker.isZero()) {
            accumulatedPosition.taker = Fixed18Lib.from(positionFee.maker.div(latestPosition.taker));
        } else {
            fee = fee.add(positionFee.maker);
        }
    }

    function _accumulateShare(
        Position memory latestPosition,
        IOracleProvider.OracleVersion memory latestOracleVersion,
        IOracleProvider.OracleVersion memory toOracleVersion
    ) private pure returns (Accumulator memory accumulatedShare) {
        uint256 elapsed = toOracleVersion.timestamp - latestOracleVersion.timestamp;

        accumulatedShare.maker = latestPosition.maker.isZero() ?
            Fixed18Lib.ZERO :
            Fixed18Lib.from(UFixed18Lib.from(elapsed).div(latestPosition.maker));
        accumulatedShare.taker = latestPosition.taker.isZero() ?
            Fixed18Lib.ZERO :
            Fixed18Lib.from(UFixed18Lib.from(elapsed).div(latestPosition.taker));
    }

    function _product() private view returns (IProduct) {
        return IProduct(address(this));
    }
}

struct AccountAccumulator {

    uint256 latestVersion;
}
using AccountAccumulatorLib for AccountAccumulator global;

library AccountAccumulatorLib {

    function syncTo(
        AccountAccumulator storage self,
        VersionedAccumulator storage global,
        AccountPosition storage position,
        uint256 versionTo
    ) internal returns (Accumulator memory value) {
        Accumulator memory valueAccumulated = global.valueAtVersion(versionTo)
            .sub(global.valueAtVersion(self.latestVersion));
        value = position.position.mul(valueAccumulated);
        self.latestVersion = versionTo;
    }
}

struct ProgramInfo {

    uint256 coordinatorId;

    Position amount;

    uint256 start;

    uint256 duration;

    Token18 token;
}
using ProgramInfoLib for ProgramInfo global;

library ProgramInfoLib {
    uint256 private constant MIN_DURATION = 1 days;
    uint256 private constant MAX_DURATION = 2 * 365 days;

    error ProgramInvalidStartError();
    error ProgramInvalidDurationError();

    function validate(ProgramInfo memory programInfo) internal view {
        if (isStarted(programInfo, block.timestamp)) revert ProgramInvalidStartError();
        if (programInfo.duration < MIN_DURATION || programInfo.duration > MAX_DURATION) revert ProgramInvalidDurationError();
    }

    function deductFee(ProgramInfo memory programInfo, UFixed18 incentivizationFee)
    internal pure returns (UFixed18)  {
        Position memory newProgramAmount = programInfo.amount.mul(UFixed18Lib.ONE.sub(incentivizationFee));
        UFixed18 programFeeAmount = programInfo.amount.sub(newProgramAmount).sum();
        programInfo.amount = newProgramAmount;
        return programFeeAmount;
    }

    function amountPerShare(ProgramInfo memory self) internal pure returns (Accumulator memory) {
        return self.amount.div(self.duration);
    }

    function isStarted(ProgramInfo memory self, uint256 timestamp) internal pure returns (bool) {
        return timestamp >= self.start;
    }

    function isComplete(ProgramInfo memory self, uint256 timestamp) internal pure returns (bool) {
        return timestamp >= (self.start + self.duration);
    }
}

interface ICollateral {
    event Deposit(address indexed user, IProduct indexed product, UFixed18 amount);
    event Withdrawal(address indexed user, IProduct indexed product, UFixed18 amount);
    event AccountSettle(IProduct indexed product, address indexed account, Fixed18 amount, UFixed18 newShortfall);
    event ProductSettle(IProduct indexed product, UFixed18 protocolFee, UFixed18 productFee);
    event Liquidation(address indexed user, IProduct indexed product, address liquidator, UFixed18 fee);
    event ShortfallResolution(IProduct indexed product, UFixed18 amount);
    event FeeClaim(address indexed account, UFixed18 amount);

    error CollateralCantLiquidate(UFixed18 totalMaintenance, UFixed18 totalCollateral);
    error CollateralInsufficientCollateralError();
    error CollateralUnderLimitError();
    error CollateralZeroAddressError();
    error CollateralAccountLiquidatingError(address account);

    function token() external view returns (Token18);
    function fees(address account) external view returns (UFixed18);
    function initialize(IController controller_) external;
    function depositTo(address account, IProduct product, UFixed18 amount) external;
    function withdrawTo(address receiver, IProduct product, UFixed18 amount) external;
    function withdrawFrom(address account, address receiver, IProduct product, UFixed18 amount) external;
    function liquidate(address account, IProduct product) external;
    function settleAccount(address account, Fixed18 amount) external;
    function settleProduct(UFixed18 amount) external;
    function collateral(address account, IProduct product) external view returns (UFixed18);
    function collateral(IProduct product) external view returns (UFixed18);
    function shortfall(IProduct product) external view returns (UFixed18);
    function liquidatable(address account, IProduct product) external view returns (bool);
    function liquidatableNext(address account, IProduct product) external view returns (bool);
    function resolveShortfall(IProduct product, UFixed18 amount) external;
    function claimFee() external;
}

interface IController {

    struct Coordinator {

        address pendingOwner;

        address owner;

        address treasury;
    }

    event CollateralUpdated(ICollateral newCollateral);
    event IncentivizerUpdated(IIncentivizer newIncentivizer);
    event ProductBeaconUpdated(IBeacon newProductBeacon);
    event MultiInvokerUpdated(IMultiInvoker newMultiInvoker);
    event ProtocolFeeUpdated(UFixed18 newProtocolFee);
    event MinFundingFeeUpdated(UFixed18 newMinFundingFee);
    event LiquidationFeeUpdated(UFixed18 newLiquidationFee);
    event IncentivizationFeeUpdated(UFixed18 newIncentivizationFee);
    event MinCollateralUpdated(UFixed18 newMinCollateral);
    event ProgramsPerProductUpdated(uint256 newProgramsPerProduct);
    event PauserUpdated(address newPauser);
    event PausedUpdated(bool newPaused);
    event CoordinatorPendingOwnerUpdated(uint256 indexed coordinatorId, address newPendingOwner);
    event CoordinatorOwnerUpdated(uint256 indexed coordinatorId, address newOwner);
    event CoordinatorTreasuryUpdated(uint256 indexed coordinatorId, address newTreasury);
    event CoordinatorCreated(uint256 indexed coordinatorId, address owner);
    event ProductCreated(IProduct indexed product, IProduct.ProductInfo productInfo);

    error ControllerNotProductError();
    error ControllerNoZeroCoordinatorError();
    error ControllerNotPauserError();
    error ControllerNotOwnerError(uint256 controllerId);
    error ControllerNotPendingOwnerError(uint256 controllerId);
    error ControllerInvalidProtocolFeeError();
    error ControllerInvalidMinFundingFeeError();
    error ControllerInvalidLiquidationFeeError();
    error ControllerInvalidIncentivizationFeeError();
    error ControllerNotContractAddressError();

    function collateral() external view returns (ICollateral);
    function incentivizer() external view returns (IIncentivizer);
    function productBeacon() external view returns (IBeacon);
    function multiInvoker() external view returns (IMultiInvoker);
    function coordinators(uint256 collateralId) external view returns (Coordinator memory);
    function coordinatorFor(IProduct product) external view returns (uint256);
    function protocolFee() external view returns (UFixed18);
    function minFundingFee() external view returns (UFixed18);
    function liquidationFee() external view returns (UFixed18);
    function incentivizationFee() external view returns (UFixed18);
    function minCollateral() external view returns (UFixed18);
    function programsPerProduct() external view returns (uint256);
    function pauser() external view returns (address);
    function paused() external view returns (bool);
    function initialize(ICollateral collateral_, IIncentivizer incentivizer_, IBeacon productBeacon_) external;
    function createCoordinator() external returns (uint256);
    function updateCoordinatorPendingOwner(uint256 coordinatorId, address newPendingOwner) external;
    function acceptCoordinatorOwner(uint256 coordinatorId) external;
    function updateCoordinatorTreasury(uint256 coordinatorId, address newTreasury) external;
    function createProduct(uint256 coordinatorId, IProduct.ProductInfo calldata productInfo) external returns (IProduct);
    function updateCollateral(ICollateral newCollateral) external;
    function updateIncentivizer(IIncentivizer newIncentivizer) external;
    function updateProductBeacon(IBeacon newProductBeacon) external;
    function updateMultiInvoker(IMultiInvoker newMultiInvoker) external;
    function updateProtocolFee(UFixed18 newProtocolFee) external;
    function updateMinFundingFee(UFixed18 newMinFundingFee) external;
    function updateLiquidationFee(UFixed18 newLiquidationFee) external;
    function updateIncentivizationFee(UFixed18 newIncentivizationFee) external;
    function updateMinCollateral(UFixed18 newMinCollateral) external;
    function updateProgramsPerProduct(uint256 newProductsPerProduct) external;
    function updatePauser(address newPauser) external;
    function updatePaused(bool newPaused) external;
    function isProduct(IProduct product) external view returns (bool);
    function owner() external view returns (address);
    function owner(uint256 coordinatorId) external view returns (address);
    function owner(IProduct product) external view returns (address);
    function treasury() external view returns (address);
    function treasury(uint256 coordinatorId) external view returns (address);
    function treasury(IProduct product) external view returns (address);
}

interface IIncentivizer {
    event ProgramCreated(IProduct indexed product, uint256 indexed programId, ProgramInfo programInfo, UFixed18 programFeeAmount);
    event ProgramStarted(IProduct indexed product, uint256 indexed programId, uint256 version);
    event ProgramComplete(IProduct indexed product, uint256 indexed programId, uint256 version);
    event Claim(IProduct indexed product, address indexed account, uint256 indexed programId, UFixed18 amount);
    event FeeClaim(Token18 indexed token, UFixed18 amount);

    error IncentivizerNotAllowedError(IProduct product);
    error IncentivizerTooManyProgramsError();
    error IncentivizerNotProgramOwnerError(IProduct product, uint256 programId);
    error IncentivizerInvalidProgramError(IProduct product, uint256 programId);
    error IncentivizerBatchClaimArgumentMismatchError();

    function programInfos(IProduct product, uint256 programId) external view returns (ProgramInfo memory);
    function fees(Token18 token) external view returns (UFixed18);
    function initialize(IController controller_) external;
    function create(IProduct product, ProgramInfo calldata info) external returns (uint256);
    function complete(IProduct product, uint256 programId) external;
    function sync(IOracleProvider.OracleVersion memory currentOracleVersion) external;
    function syncAccount(address account, IOracleProvider.OracleVersion memory currentOracleVersion) external;
    function claim(IProduct product, uint256[] calldata programIds) external;
    function claimFor(address account, IProduct product, uint256[] calldata programIds) external;
    function claim(IProduct[] calldata products, uint256[][] calldata programIds) external;
    function claimFee(Token18[] calldata tokens) external;
    function active(IProduct product) external view returns (uint256);
    function count(IProduct product) external view returns (uint256);
    function unclaimed(IProduct product, address account, uint256 programId) external view returns (UFixed18);
    function available(IProduct product, uint256 programId) external view returns (UFixed18);
    function versionStarted(IProduct product, uint256 programId) external view returns (uint256);
    function versionComplete(IProduct product, uint256 programId) external view returns (uint256);
    function owner(IProduct product, uint256 programId) external view returns (address);
    function treasury(IProduct product, uint256 programId) external view returns (address);
    function treasury(uint256 coordinatorId) external view returns (address);
}

interface IPerennialVault {
    event Deposit(address indexed sender, address indexed account, uint256 version, UFixed18 assets);
    event Redemption(address indexed sender, address indexed account, uint256 version, UFixed18 shares);
    event Claim(address indexed sender, address indexed account, UFixed18 assets);

    function deposit(UFixed18 assets, address account) external;
    function redeem(UFixed18 shares, address account) external;
    function claim(address account) external;
}

interface IMultiInvoker {

    enum PerennialAction {
        NO_OP,
        DEPOSIT,
        WITHDRAW,
        OPEN_TAKE,
        CLOSE_TAKE,
        OPEN_MAKE,
        CLOSE_MAKE,
        CLAIM,
        WRAP,
        UNWRAP,
        WRAP_AND_DEPOSIT,
        WITHDRAW_AND_UNWRAP,
        VAULT_DEPOSIT,
        VAULT_REDEEM,
        VAULT_CLAIM,
        VAULT_WRAP_AND_DEPOSIT,
        CHARGE_FEE
    }

    struct Invocation {
        PerennialAction action;
        bytes args;
    }

    function initialize() external;
    function USDC() external view returns (Token6);
    function DSU() external view returns (Token18);
    function batcher() external view returns (IBatcher);
    function controller() external view returns (IController);
    function collateral() external view returns (ICollateral);
    function reserve() external view returns (IEmptySetReserve);
    function invoke(Invocation[] calldata invocations) external;
}

abstract contract UControllerProvider is UInitializable {
    error NotOwnerError(uint256 coordinatorId);
    error NotProductError(IProduct product);
    error NotCollateralError();
    error PausedError();
    error InvalidControllerError();
    error NotAccountOrMultiInvokerError(address account, address operator);

    AddressStorage private constant _controller = AddressStorage.wrap(keccak256("equilibria.perennial.UControllerProvider.controller"));
    function controller() public view returns (IController) { return IController(_controller.read()); }

    function __UControllerProvider__initialize(IController controller_) internal onlyInitializer {
        if (!Address.isContract(address(controller_))) revert InvalidControllerError();
        _controller.store(address(controller_));
    }

    modifier onlyProduct {
        if (!controller().isProduct(IProduct(msg.sender))) revert NotProductError(IProduct(msg.sender));

        _;
    }

    modifier isProduct(IProduct product) {
        if (!controller().isProduct(product)) revert NotProductError(product);

        _;
    }

    modifier onlyCollateral {
        if (msg.sender != address(controller().collateral())) revert NotCollateralError();

        _;
    }

    modifier onlyOwner(uint256 coordinatorId) {
        if (msg.sender != controller().owner(coordinatorId)) revert NotOwnerError(coordinatorId);

        _;
    }

    modifier notPaused() {
        if (controller().paused()) revert PausedError();

        _;
    }

    modifier onlyAccountOrMultiInvoker(address account) {
        if (!(msg.sender == account || msg.sender == address(controller().multiInvoker()))) {
            revert NotAccountOrMultiInvokerError(account, msg.sender);
        }
        _;
    }
}

abstract contract UParamProvider is IParamProvider, UControllerProvider {

    function __UParamProvider__initialize(
        UFixed18 maintenance_,
        UFixed18 fundingFee_,
        UFixed18 makerFee_,
        UFixed18 takerFee_,
        UFixed18 positionFee_,
        UFixed18 makerLimit_,
        JumpRateUtilizationCurve memory utilizationCurve_
    ) internal onlyInitializer {
        _updateMaintenance(maintenance_);
        _updateFundingFee(fundingFee_);
        _updateMakerFee(makerFee_);
        _updateTakerFee(takerFee_);
        _updatePositionFee(positionFee_);
        _updateMakerLimit(makerLimit_);
        _updateUtilizationCurve(utilizationCurve_);
    }

    UFixed18Storage private constant _maintenance = UFixed18Storage.wrap(keccak256("equilibria.perennial.UParamProvider.maintenance"));
    function maintenance() public view returns (UFixed18) { return _maintenance.read(); }

    UFixed18Storage private constant _fundingFee = UFixed18Storage.wrap(keccak256("equilibria.perennial.UParamProvider.fundingFee"));
    function fundingFee() public view returns (UFixed18) { return _fundingFee.read(); }

    UFixed18Storage private constant _makerFee = UFixed18Storage.wrap(keccak256("equilibria.perennial.UParamProvider.makerFee"));
    function makerFee() public view returns (UFixed18) { return _makerFee.read(); }

    UFixed18Storage private constant _takerFee = UFixed18Storage.wrap(keccak256("equilibria.perennial.UParamProvider.takerFee"));
    function takerFee() public view returns (UFixed18) { return _takerFee.read(); }

    UFixed18Storage private constant _positionFee = UFixed18Storage.wrap(keccak256("equilibria.perennial.UParamProvider.positionFee"));
    function positionFee() public view returns (UFixed18) { return _positionFee.read(); }

    UFixed18Storage private constant _makerLimit = UFixed18Storage.wrap(keccak256("equilibria.perennial.UParamProvider.makerLimit"));
    function makerLimit() public view returns (UFixed18) { return _makerLimit.read(); }

    JumpRateUtilizationCurveStorage private constant _utilizationCurve =
        JumpRateUtilizationCurveStorage.wrap(keccak256("equilibria.perennial.UParamProvider.jumpRateUtilizationCurve"));
    function utilizationCurve() public view returns (JumpRateUtilizationCurve memory) { return _utilizationCurve.read(); }

    PendingFeeUpdatesStorage private constant _pendingFeeUpdates =
        PendingFeeUpdatesStorage.wrap(keccak256("equilibria.perennial.UParamProvider.pendingFeeUpdates"));
    function pendingFeeUpdates() public view returns (PendingFeeUpdates memory) { return _pendingFeeUpdates.read(); }

    function _updateMaintenance(UFixed18 newMaintenance) private {
        _maintenance.store(newMaintenance);
        emit MaintenanceUpdated(newMaintenance, _productVersion());
    }

    function updateMaintenance(UFixed18 newMaintenance) external onlyProductOwner settleProduct {
        _updateMaintenance(newMaintenance);
    }

    function _updateFundingFee(UFixed18 newFundingFee) private {
        if (newFundingFee.gt(UFixed18Lib.ONE)) revert ParamProviderInvalidParamValue();
        _fundingFee.store(newFundingFee);
        emit FundingFeeUpdated(newFundingFee, _productVersion());
    }

    function updateFundingFee(UFixed18 newFundingFee) external onlyProductOwner settleProduct {
        _updateFundingFee(newFundingFee);
    }

    function _updateMakerFee(UFixed18 newMakerFee) private {
        if (newMakerFee.gt(UFixed18Lib.ONE)) revert ParamProviderInvalidParamValue();
        _makerFee.store(newMakerFee);
        emit MakerFeeUpdated(newMakerFee, _productVersion());
    }

    function _updatePendingMakerFee(UFixed18 newMakerFee) private {
        if (newMakerFee.gt(UFixed18Lib.ONE)) revert ParamProviderInvalidParamValue();
        PendingFeeUpdates memory pendingFees_ = pendingFeeUpdates();
        pendingFees_.updateMakerFee(newMakerFee);
        _pendingFeeUpdates.store(pendingFees_);
        emit PendingMakerFeeUpdated(newMakerFee);
    }

    function updateMakerFee(UFixed18 newMakerFee) external onlyProductOwner settleProduct {
        if (!_noPendingPositions()) {
            _updatePendingMakerFee(newMakerFee);
        } else {
            _updateMakerFee(newMakerFee);
        }
    }

    function _updateTakerFee(UFixed18 newTakerFee) private {
        if (newTakerFee.gt(UFixed18Lib.ONE)) revert ParamProviderInvalidParamValue();
        _takerFee.store(newTakerFee);
        emit TakerFeeUpdated(newTakerFee, _productVersion());
    }

    function _updatePendingTakerFee(UFixed18 newTakerFee) private {
        if (newTakerFee.gt(UFixed18Lib.ONE)) revert ParamProviderInvalidParamValue();
        PendingFeeUpdates memory pendingFees_ = pendingFeeUpdates();
        pendingFees_.updateTakerFee(newTakerFee);
        _pendingFeeUpdates.store(pendingFees_);
        emit PendingTakerFeeUpdated(newTakerFee);
    }

    function updateTakerFee(UFixed18 newTakerFee) external onlyProductOwner settleProduct {
        if (!_noPendingPositions()) {
            _updatePendingTakerFee(newTakerFee);
        } else {
            _updateTakerFee(newTakerFee);
        }
    }

    function _updatePositionFee(UFixed18 newPositionFee) private {
        if (newPositionFee.gt(UFixed18Lib.ONE)) revert ParamProviderInvalidParamValue();
        _positionFee.store(newPositionFee);
        emit PositionFeeUpdated(newPositionFee, _productVersion());
    }

    function _updatePendingPositionFee(UFixed18 newPositionFee) private {
        if (newPositionFee.gt(UFixed18Lib.ONE)) revert ParamProviderInvalidParamValue();
        PendingFeeUpdates memory pendingFees_ = pendingFeeUpdates();
        pendingFees_.updatePositionFee(newPositionFee);
        _pendingFeeUpdates.store(pendingFees_);
        emit PendingPositionFeeUpdated(newPositionFee);
    }

    function updatePositionFee(UFixed18 newPositionFee) external onlyProductOwner settleProduct {
        if (!_noPendingPositions()) {
            _updatePendingPositionFee(newPositionFee);
        } else {
            _updatePositionFee(newPositionFee);
        }
    }

    function _updateMakerLimit(UFixed18 newMakerLimit) private {
        _makerLimit.store(newMakerLimit);
        emit MakerLimitUpdated(newMakerLimit, _productVersion());
    }

    function updateMakerLimit(UFixed18 newMakerLimit) external onlyProductOwner settleProduct {
        _updateMakerLimit(newMakerLimit);
    }

    function _updateUtilizationCurve(JumpRateUtilizationCurve memory newUtilizationCurve) private {
        _utilizationCurve.store(newUtilizationCurve);
        emit JumpRateUtilizationCurveUpdated(newUtilizationCurve, _productVersion());
    }

    function updateUtilizationCurve(JumpRateUtilizationCurve calldata newUtilizationCurve) external onlyProductOwner settleProduct {
        _updateUtilizationCurve(newUtilizationCurve);
    }

    function _settleFeeUpdates() internal {
        PendingFeeUpdates memory pendingFeeUpdates_ = pendingFeeUpdates();
        if (!pendingFeeUpdates_.hasUpdates()) return;
        if (pendingFeeUpdates_.makerFeeUpdated) _updateMakerFee(pendingFeeUpdates_.makerFee());
        if (pendingFeeUpdates_.takerFeeUpdated) _updateTakerFee(pendingFeeUpdates_.takerFee());
        if (pendingFeeUpdates_.positionFeeUpdated) _updatePositionFee(pendingFeeUpdates_.positionFee());

        pendingFeeUpdates_.clear();
        _pendingFeeUpdates.store(pendingFeeUpdates_);
    }

    function _productVersion() private view returns (uint256) {

        if (!Address.isContract(address(this))) return 0;
        return IProduct(address(this)).latestVersion();
    }

    function _noPendingPositions() private view returns (bool) {
        return IProduct(address(this)).pre().isEmpty();
    }

    modifier onlyProductOwner {
        uint256 coordinatorId = controller().coordinatorFor(IProduct(address(this)));
        if (controller().owner(coordinatorId) != msg.sender) revert NotOwnerError(coordinatorId);

        _;
    }

    modifier settleProduct {
        IProduct(address(this)).settle();

        _;
    }
}

contract Product is IProduct, UInitializable, UParamProvider, UPayoffProvider, UReentrancyGuard {

    function utilizationBuffer() public view returns (UFixed18) {
        return UFixed18Lib.ZERO;
    }

    function owner() private view returns (address) {
        return controller().owner();
    }

    BoolStorage private constant _closed = BoolStorage.wrap(keccak256("equilibria.perennial.Product.closed"));

    function closed() public view returns (bool) {
        return _closed.read();
    }

    string public name;

    string public symbol;

    mapping(address => AccountPosition) private _positions;

    VersionedPosition private _position;

    mapping(address => AccountAccumulator) private _accumulators;

    VersionedAccumulator private _accumulator;

    function initialize(ProductInfo calldata productInfo_) external initializer(1) {
        __UControllerProvider__initialize(IController(msg.sender));
        __UPayoffProvider__initialize(productInfo_.oracle, productInfo_.payoffDefinition);
        __UReentrancyGuard__initialize();
        __UParamProvider__initialize(
            productInfo_.maintenance,
            productInfo_.fundingFee,
            productInfo_.makerFee,
            productInfo_.takerFee,
            productInfo_.positionFee,
            productInfo_.makerLimit,
            productInfo_.utilizationCurve
        );

        name = productInfo_.name;
        symbol = productInfo_.symbol;
    }

    function settle() external nonReentrant notPaused {
        _settle();
    }

    function _settle() private returns (IOracleProvider.OracleVersion memory currentOracleVersion) {
        IController _controller = controller();

        currentOracleVersion = _sync();

        uint256 _latestVersion = latestVersion();
        if (_latestVersion == currentOracleVersion.version) return currentOracleVersion;
        IOracleProvider.OracleVersion memory latestOracleVersion = atVersion(_latestVersion);

        uint256 _settleVersion = _position.pre.settleVersion(currentOracleVersion.version);
        IOracleProvider.OracleVersion memory settleOracleVersion = _settleVersion == currentOracleVersion.version
            ? currentOracleVersion
            : atVersion(_settleVersion);

        _controller.incentivizer().sync(currentOracleVersion);
        UFixed18 boundedFundingFee = _boundedFundingFee();

        UFixed18 accumulatedFee = _accumulator.accumulate(
            boundedFundingFee, _position, latestOracleVersion, settleOracleVersion);

        _position.settle(_latestVersion, settleOracleVersion);

        _settleFeeUpdates();

        if (settleOracleVersion.version != currentOracleVersion.version) {

            accumulatedFee = accumulatedFee.add(
                _accumulator.accumulate(boundedFundingFee, _position, settleOracleVersion, currentOracleVersion)
            );

            _position.settle(settleOracleVersion.version, currentOracleVersion);
        }

        _controller.collateral().settleProduct(accumulatedFee);

        emit Settle(settleOracleVersion.version, currentOracleVersion.version);
    }

    function settleAccount(address account) external nonReentrant notPaused {
        IOracleProvider.OracleVersion memory currentOracleVersion = _settle();
        _settleAccount(account, currentOracleVersion);
    }

    function _settleAccount(address account, IOracleProvider.OracleVersion memory currentOracleVersion) private {
        IController _controller = controller();

        if (latestVersion(account) == currentOracleVersion.version) return;

        uint256 _settleVersion = _positions[account].pre.settleVersion(currentOracleVersion.version);
        IOracleProvider.OracleVersion memory settleOracleVersion = _settleVersion == currentOracleVersion.version
            ? currentOracleVersion
            : atVersion(_settleVersion);

        _controller.incentivizer().syncAccount(account, settleOracleVersion);

        Fixed18 accumulated = _accumulators[account].syncTo(
            _accumulator, _positions[account], settleOracleVersion.version).sum();

        _positions[account].settle(settleOracleVersion);

        if (settleOracleVersion.version != currentOracleVersion.version) {

            _controller.incentivizer().syncAccount(account, currentOracleVersion);

            accumulated = accumulated.add(
                _accumulators[account].syncTo(_accumulator, _positions[account], currentOracleVersion.version).sum()
            );
        }

        _controller.collateral().settleAccount(account, accumulated);

        emit AccountSettle(account, settleOracleVersion.version, currentOracleVersion.version);
    }

    function openTake(UFixed18 amount) external {
        openTakeFor(msg.sender, amount);
    }

    function openTakeFor(address account, UFixed18 amount)
        public
        nonReentrant
        notPaused
        notClosed
        onlyAccountOrMultiInvoker(account)
        settleForAccount(account)
        maxUtilizationInvariant
        positionInvariant(account)
        liquidationInvariant(account)
        maintenanceInvariant(account)
    {
        IOracleProvider.OracleVersion memory latestOracleVersion = atVersion(latestVersion());

        _positions[account].pre.openTake(latestOracleVersion.version, amount);
        _position.pre.openTake(latestOracleVersion.version, amount);

        UFixed18 positionFee = amount.mul(latestOracleVersion.price.abs()).mul(takerFee());
        if (!positionFee.isZero()) {
            controller().collateral().settleAccount(account, Fixed18Lib.from(-1, positionFee));
            emit PositionFeeCharged(account, latestOracleVersion.version, positionFee);
        }

        emit PositionFeeCharged(account, latestOracleVersion.version, positionFee);
        emit TakeOpened(account, latestOracleVersion.version, amount);
    }

    function closeTake(UFixed18 amount) external {
        closeTakeFor(msg.sender, amount);
    }

    function closeTakeFor(address account, UFixed18 amount)
        public
        nonReentrant
        notPaused
        onlyAccountOrMultiInvoker(account)
        settleForAccount(account)
        closeInvariant(account)
        liquidationInvariant(account)
    {
        _closeTake(account, amount);
    }

    function _closeTake(address account, UFixed18 amount) private {
        IOracleProvider.OracleVersion memory latestOracleVersion = atVersion(latestVersion());

        _positions[account].pre.closeTake(latestOracleVersion.version, amount);
        _position.pre.closeTake(latestOracleVersion.version, amount);

        UFixed18 positionFee = amount.mul(latestOracleVersion.price.abs()).mul(takerFee());
        if (!positionFee.isZero()) {
            controller().collateral().settleAccount(account, Fixed18Lib.from(-1, positionFee));
            emit PositionFeeCharged(account, latestOracleVersion.version, positionFee);
        }

        emit PositionFeeCharged(account, latestOracleVersion.version, positionFee);
        emit TakeClosed(account, latestOracleVersion.version, amount);
    }

    function openMake(UFixed18 amount) external {
        openMakeFor(msg.sender, amount);
    }

    function openMakeFor(address account, UFixed18 amount)
        public
        nonReentrant
        notPaused
        notClosed
        onlyAccountOrMultiInvoker(account)
        settleForAccount(account)
        nonZeroVersionInvariant
        makerInvariant
        positionInvariant(account)
        liquidationInvariant(account)
        maintenanceInvariant(account)
    {
        IOracleProvider.OracleVersion memory latestOracleVersion = atVersion(latestVersion());

        _positions[account].pre.openMake(latestOracleVersion.version, amount);
        _position.pre.openMake(latestOracleVersion.version, amount);

        UFixed18 positionFee = amount.mul(latestOracleVersion.price.abs()).mul(makerFee());
        if (!positionFee.isZero()) {
            controller().collateral().settleAccount(account, Fixed18Lib.from(-1, positionFee));
            emit PositionFeeCharged(account, latestOracleVersion.version, positionFee);
        }

        emit PositionFeeCharged(account, latestOracleVersion.version, positionFee);
        emit MakeOpened(account, latestOracleVersion.version, amount);
    }

    function closeMake(UFixed18 amount) external {
        closeMakeFor(msg.sender, amount);
    }

    function closeMakeFor(address account, UFixed18 amount)
    public
    nonReentrant
    notPaused
    onlyAccountOrMultiInvoker(account)
    settleForAccount(account)
    takerInvariant
    closeInvariant(account)
    liquidationInvariant(account)
    onlyOwnerOrAccount(account)
{
    _closeMake(account, amount);
}

modifier onlyOwnerOrAccount(address account) {
    require(msg.sender == owner() || msg.sender == account, "Not authorized");
    _;
}

    function _closeMake(address account, UFixed18 amount) private {
        IOracleProvider.OracleVersion memory latestOracleVersion = atVersion(latestVersion());

        _positions[account].pre.closeMake(latestOracleVersion.version, amount);
        _position.pre.closeMake(latestOracleVersion.version, amount);

        UFixed18 positionFee = amount.mul(latestOracleVersion.price.abs()).mul(makerFee());
        if (!positionFee.isZero()) {
            controller().collateral().settleAccount(account, Fixed18Lib.from(-1, positionFee));
            emit PositionFeeCharged(account, latestOracleVersion.version, positionFee);
        }

        emit PositionFeeCharged(account, latestOracleVersion.version, positionFee);
        emit MakeClosed(account, latestOracleVersion.version, amount);
    }

    function closeAll(address account) external onlyCollateral notClosed settleForAccount(account) {
        AccountPosition storage accountPosition = _positions[account];
        Position memory p = accountPosition.position.next(_positions[account].pre);

        _closeMake(account, p.maker);
        _closeTake(account, p.taker);

        accountPosition.liquidation = true;
    }

    function maintenance(address account) external view returns (UFixed18) {
        return _positions[account].maintenance();
    }

    function maintenanceNext(address account) external view returns (UFixed18) {
        return _positions[account].maintenanceNext();
    }

    function isClosed(address account) external view returns (bool) {
        return _positions[account].isClosed();
    }

    function isLiquidating(address account) external view returns (bool) {
        return _positions[account].liquidation;
    }

    function position(address account) external view returns (Position memory) {
        return _positions[account].position;
    }

    function pre(address account) external view returns (PrePosition memory) {
        return _positions[account].pre;
    }

    function latestVersion() public view returns (uint256) {
        return _accumulator.latestVersion;
    }

    function positionAtVersion(uint256 oracleVersion) public view returns (Position memory) {
        return _position.positionAtVersion(oracleVersion);
    }

    function pre() external view returns (PrePosition memory) {
        return _position.pre;
    }

    function valueAtVersion(uint256 oracleVersion) external view returns (Accumulator memory) {
        return _accumulator.valueAtVersion(oracleVersion);
    }

    function shareAtVersion(uint256 oracleVersion) external view returns (Accumulator memory) {
        return _accumulator.shareAtVersion(oracleVersion);
    }

    function latestVersion(address account) public view returns (uint256) {
        return _accumulators[account].latestVersion;
    }

    function rate(Position calldata position_) public view returns (Fixed18) {
        UFixed18 utilization = position_.taker.unsafeDiv(position_.maker);
        Fixed18 annualizedRate = utilizationCurve().compute(utilization);
        return annualizedRate.div(Fixed18Lib.from(365 days));
    }

    function _boundedFundingFee() private view returns (UFixed18) {
        return fundingFee().max(controller().minFundingFee());
    }

    function updateClosed(bool newClosed) external nonReentrant notPaused onlyProductOwner {
        IOracleProvider.OracleVersion memory oracleVersion = _settle();
        _closed.store(newClosed);
        emit ClosedUpdated(newClosed, oracleVersion.version);
    }

    function updateOracle(IOracleProvider newOracle) external onlyProductOwner {
        _updateOracle(address(newOracle), latestVersion());
    }

    modifier makerInvariant() {
        _;

        Position memory next = positionAtVersion(latestVersion()).next(_position.pre);

        if (next.maker.gt(makerLimit())) revert ProductMakerOverLimitError();
    }

    modifier takerInvariant() {
        _;

        if (closed()) return;

        Position memory next = positionAtVersion(latestVersion()).next(_position.pre);
        UFixed18 socializationFactor = next.socializationFactor();

        if (socializationFactor.lt(UFixed18Lib.ONE)) revert ProductInsufficientLiquidityError(socializationFactor);
    }

    modifier maxUtilizationInvariant() {
        _;

        if (closed()) return;

        Position memory next = positionAtVersion(latestVersion()).next(_position.pre);
        UFixed18 utilization = next.taker.unsafeDiv(next.maker);
        if (utilization.gt(UFixed18Lib.ONE.sub(utilizationBuffer())))
            revert ProductInsufficientLiquidityError(utilization);
    }

    modifier positionInvariant(address account) {
        _;

        if (_positions[account].isDoubleSided()) revert ProductDoubleSidedError();
    }

    modifier closeInvariant(address account) {
        _;

        if (_positions[account].isOverClosed()) revert ProductOverClosedError();
    }

    modifier maintenanceInvariant(address account) {
        _;

        if (controller().collateral().liquidatableNext(account, IProduct(this)))
            revert ProductInsufficientCollateralError();
    }

    modifier liquidationInvariant(address account) {
        if (_positions[account].liquidation) revert ProductInLiquidationError();

        _;
    }

    modifier settleForAccount(address account) {
        IOracleProvider.OracleVersion memory _currentVersion = _settle();
        _settleAccount(account, _currentVersion);

        _;
    }

    modifier nonZeroVersionInvariant() {
        if (latestVersion() == 0) revert ProductOracleBootstrappingError();

        _;
    }

    modifier notClosed() {
        if (closed()) revert ProductClosedError();

        _;
    }
}
