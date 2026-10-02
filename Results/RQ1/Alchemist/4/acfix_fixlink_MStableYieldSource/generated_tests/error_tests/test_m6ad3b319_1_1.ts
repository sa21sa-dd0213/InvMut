import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant m6ad3b319 - onlyOwner modifier", function () {
  it("should revert when non-owner calls approveMax due to onlyOwner modifier", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a mock mAsset address
    // First deploy a mock ERC20 to use as the underlying mAsset
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20Factory.deploy("Mock MAsset", "mMASS", ethers.parseEther("1000000"));
    await mockMAsset.waitForDeployment();

    // Deploy mock savings contract
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy(await mockMAsset.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Attempt to call approveMax from a non-owner address
    // The original contract has require(msg.sender == _contractOwner, ...) in onlyOwner
    // The mutant removes this require, so the call would succeed instead of reverting
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});