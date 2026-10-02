import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant m68341ad4 (redeemToken addition bug)", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let mockSavingsContract: any;
  let mockMAsset: any;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock mAsset token (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockMAsset = await MockERC20.deploy("Mock mAsset", "mASSET", 18);
    await mockMAsset.waitForDeployment();

    // Deploy mock SavingsContract that returns the mAsset address
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContract");
    mockSavingsContract = await MockSavingsContract.deploy(await mockMAsset.getAddress());
    await mockSavingsContract.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    instance = await Factory.deploy(await mockSavingsContract.getAddress());
    await instance.waitForDeployment();

    // Transfer some mAsset tokens to addr1 for testing
    await mockMAsset.transfer(addr1.address, ethers.parseEther("1000"));
  });

  it("should kill mutant by verifying redeemToken returns correct actual amount (difference, not sum)", async function () {
    const supplyAmount = ethers.parseEther("100");
    
    // Approve and supply tokens
    await mockMAsset.connect(addr1).approve(await instance.getAddress(), supplyAmount);
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);

    // Get initial balance of addr1 and contract before redemption
    const addr1BalanceBefore = await mockMAsset.balanceOf(addr1.address);
    const contractBalanceBefore = await mockMAsset.balanceOf(await instance.getAddress());

    // Configure mock to return some tokens on redeemUnderlying
    const redeemAmount = ethers.parseEther("50");
    const mockReturnAmount = ethers.parseEther("50");
    await mockSavingsContract.setRedeemUnderlyingReturn(mockReturnAmount);
    await mockSavingsContract.setBalanceOfReturn(contractBalanceBefore + mockReturnAmount);

    // Call redeemToken
    const tx = await instance.connect(addr1).redeemToken(redeemAmount);
    const receipt = await tx.wait();

    // Get actual mAssets returned from the event
    const event = receipt.logs.find((log: any) => log.fragment?.name === "Redeemed");
    const actualAmount = event.args[2];

    // In the original code, actualAmount should equal mockReturnAmount (the difference)
    // In the mutant, actualAmount would be contractBalanceBefore + (contractBalanceBefore + mockReturnAmount) which is wrong
    expect(actualAmount).to.equal(mockReturnAmount);
    
    // Also verify addr1 received the correct amount
    const addr1BalanceAfter = await mockMAsset.balanceOf(addr1.address);
    expect(addr1BalanceAfter - addr1BalanceBefore).to.equal(mockReturnAmount);
  });
});