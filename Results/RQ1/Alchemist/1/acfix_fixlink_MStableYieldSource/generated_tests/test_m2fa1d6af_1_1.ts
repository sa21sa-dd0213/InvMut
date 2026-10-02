import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant m2fa1d6af - ReentrancyGuard initialization", function () {
  it("should revert on reentrant call when ReentrancyGuard is properly initialized", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy a mock savings contract that supports reentrancy
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy the MStableYieldSource with the mock savings
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSourceFactory.deploy(await mockSavings.getAddress());
    await yieldSource.waitForDeployment();

    // Deploy a malicious contract that will attempt reentrancy
    const ReentrancyAttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttackerFactory.deploy(await yieldSource.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with mAsset tokens
    const mAssetAddress = await yieldSource.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Transfer some mAsset to attacker contract for the initial supply
    await mAsset.connect(owner).transfer(await attackerContract.getAddress(), ethers.parseEther("100"));

    // Approve yieldSource to spend attacker's tokens
    await mAsset.connect(owner).approve(await yieldSource.getAddress(), ethers.parseEther("1000"));

    // Call the attacker contract which will attempt a reentrant call
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("10"))
    ).to.be.reverted;
  });
});

// Helper mock contract to simulate savings contract with reentrancy capability
// Note: In actual test, deploy these as separate Solidity files
contract MockSavingsContractV2 {
    IERC20 public underlyingToken;
    mapping(address => uint256) public creditBalances;
    uint256 public exchangeRate = 1e18;

    constructor() {
        underlyingToken = IERC20(address(this)); // simplified for test
    }

    function underlying() external view returns (IERC20) {
        return underlyingToken;
    }

    function depositSavings(uint256 amount) external returns (uint256) {
        // Transfer tokens from caller
        underlyingToken.transferFrom(msg.sender, address(this), amount);
        uint256 credits = amount;
        creditBalances[msg.sender] += credits;
        return credits;
    }

    function redeemUnderlying(uint256 amount) external returns (uint256) {
        // This function can be exploited for reentrancy
        uint256 credits = amount;
        creditBalances[msg.sender] -= credits;

        // Reentrancy call back into yieldSource
        IMStableYieldSource(msg.sender).supplyTokenTo(amount, msg.sender);

        // Transfer underlying back
        underlyingToken.transfer(msg.sender, amount);
        return credits;
    }
}

contract ReentrancyAttacker {
    IMStableYieldSource public yieldSource;

    constructor(address _yieldSource) {
        yieldSource = IMStableYieldSource(_yieldSource);
    }

    function attack(uint256 amount) external {
        // Approve yieldSource to spend our tokens
        IERC20 underlying = IERC20(yieldSource.depositToken());
        underlying.approve(address(yieldSource), amount);

        // First supply to get credits
        yieldSource.supplyTokenTo(amount, address(this));

        // Then redeem - this will trigger reentrancy in mock savings
        yieldSource.redeemToken(amount);
    }

    // Fallback to receive ETH if needed
    receive() external payable {}
}

interface IMStableYieldSource {
    function depositToken() external view returns (address);
    function supplyTokenTo(uint256 amount, address to) external;
    function redeemToken(uint256 amount) external returns (uint256);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}