import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant m31dec8ae (missing Supplied event)", function () {
  it("should emit Supplied event when supplyTokenTo is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock savings contract that implements the required interface
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy a mock mAsset token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20Factory.deploy("Mock MAsset", "mMASS", ethers.parseEther("1000000"));
    await mockMAsset.waitForDeployment();
    
    // Configure mock savings to return our mock mAsset
    await mockSavings.setUnderlying(mockMAsset.target);
    
    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(mockSavings.target);
    await instance.waitForDeployment();
    
    // Fund addr1 with mAsset tokens and approve the yield source
    const depositAmount = ethers.parseEther("100");
    await mockMAsset.transfer(addr1.address, depositAmount);
    await mockMAsset.connect(addr1).approve(instance.target, depositAmount);
    
    // Configure mock savings to return a fixed credit amount
    const creditAmount = ethers.parseEther("100");
    await mockSavings.setDepositSavingsReturn(creditAmount);
    
    // Call supplyTokenTo and check for the Supplied event
    await expect(
      instance.connect(addr1).supplyTokenTo(depositAmount, addr2.address)
    )
      .to.emit(instance, "Supplied")
      .withArgs(addr1.address, addr2.address, depositAmount);
  });
});