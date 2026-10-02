import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant m31dec8ae - event emission", function () {
  it("should emit Supplied event when supplyTokenTo is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock savings contract that implements ISavingsContractV2
    // We need a minimal implementation for testing
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy a mock mAsset token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20Factory.deploy("Mock MAsset", "mASSET");
    await mockMAsset.waitForDeployment();

    // Configure mock savings to return our mock mAsset as underlying
    await mockSavings.setUnderlying(await mockMAsset.getAddress());

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Fund addr1 with mAsset tokens and approve
    const mintAmount = ethers.parseEther("1000");
    await mockMAsset.mint(await addr1.getAddress(), mintAmount);
    await mockMAsset.connect(addr1).approve(await instance.getAddress(), mintAmount);

    // Configure mock savings to return credits
    const supplyAmount = ethers.parseEther("100");
    await mockSavings.setDepositSavingsReturn(supplyAmount); // Return same amount as credits

    // Test: call supplyTokenTo and expect Supplied event
    await expect(
      instance.connect(addr1).supplyTokenTo(supplyAmount, await addr2.getAddress())
    )
      .to.emit(instance, "Supplied")
      .withArgs(await addr1.getAddress(), await addr2.getAddress(), supplyAmount);
  });
});