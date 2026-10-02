import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - balanceOfToken", function () {
  it("should detect the division to subtraction mutant in balanceOfToken", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a known exchange rate
    // and handles depositSavings/redeemUnderlying
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the underlying mAsset token address from the mock
    const mAssetAddress = await mockSavings.underlying();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Fund the user with mAsset tokens
    const initialBalance = ethers.parseEther("2000");
    await mAsset.connect(owner).transfer(user.address, initialBalance);

    // Approve and supply tokens to create a balance
    await mAsset.connect(user).approve(await instance.getAddress(), initialBalance);
    const supplyAmount = ethers.parseEther("1000");
    await instance.connect(user).supplyTokenTo(supplyAmount, user.address);

    // Set exchange rate to something other than 1:1 (e.g., 1.5)
    await mockSavings.setExchangeRate(ethers.parseEther("1.5"));

    // Call balanceOfToken - original should return (imBalances * 1.5e18) / 1e18 = imBalances * 1.5
    // Mutant returns (imBalances * 1.5e18) - 1e18 which is wrong
    const balance = await instance.balanceOfToken(user.address);

    // Expected: supplyAmount * 1.5 (since depositSavings returns supplyAmount in mock)
    const expectedBalance = ethers.parseEther("1500"); // 1000 * 1.5
    expect(balance).to.equal(expectedBalance);
  });
});

// Mock contract to be deployed alongside the test
// This should be in a separate file or in the test file's artifacts
// For simplicity, we include the contract code here
// pragma solidity ^0.8.0;
// import "./MStableYieldSource.sol";
// contract MockSavingsContractV2 is ISavingsContractV2 {
//     IERC20 public mAsset;
//     uint256 public exchangeRateValue = 1e18;
//     mapping(address => uint256) public creditBalances;
//     
//     constructor() {
//         mAsset = new ERC20Mock("Mock", "MOCK", 18);
//     }
//     
//     function underlying() external view override returns (IERC20) {
//         return mAsset;
//     }
//     
//     function depositSavings(uint256 amount) external override returns (uint256) {
//         mAsset.transferFrom(msg.sender, address(this), amount);
//         creditBalances[msg.sender] += amount;
//         return amount;
//     }
//     
//     function redeemUnderlying(uint256 amount) external override returns (uint256) {
//         uint256 credits = amount; // simplified 1:1 for underlying
//         creditBalances[msg.sender] -= credits;
//         mAsset.transfer(msg.sender, amount);
//         return credits;
//     }
//     
//     function exchangeRate() external view override returns (uint256) {
//         return exchangeRateValue;
//     }
//     
//     function setExchangeRate(uint256 _rate) external {
//         exchangeRateValue = _rate;
//     }
//     
//     function redeem(uint256) external override returns (uint256) { return 0; }
//     function depositInterest(uint256) external override {}
//     function depositSavings(uint256, address) external override returns (uint256) { return 0; }
//     function redeemCredits(uint256) external override returns (uint256) { return 0; }
//     function balanceOfUnderlying(address) external view override returns (uint256) { return 0; }
//     function underlyingToCredits(uint256) external view override returns (uint256) { return 0; }
//     function creditsToUnderlying(uint256) external view override returns (uint256) { return 0; }
// }