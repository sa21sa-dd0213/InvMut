import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection", function () {
  it("should detect mutant that removes balanceOfToken function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // First supply some tokens to create a balance
    // We need to get the mAsset token address
    const mAssetAddress = await instance.depositToken();
    const mAssetFactory = await ethers.getContractFactory("MockERC20");
    const mAsset = mAssetFactory.attach(mAssetAddress);
    
    // Mint tokens to owner and approve the contract
    await mAsset.mint(owner.address, ethers.parseEther("1000"));
    await mAsset.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Supply tokens to create balance
    await instance.connect(owner).supplyTokenTo(ethers.parseEther("100"), addr1.address);
    
    // Now call balanceOfToken - this should return a non-zero value for addr1
    // If the mutant removed the function, this call will fail
    await expect(instance.balanceOfToken(addr1.address)).to.not.be.reverted;
    
    // Verify the balance is greater than 0
    const balance = await instance.balanceOfToken(addr1.address);
    expect(balance).to.be.gt(0);
  });
});