import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - balanceOfToken division vs subtraction", function () {
  it("should kill mutant m2672356a by verifying balanceOfToken returns correct value after supply", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("MockToken", "MTK", 18);
    await mockToken.waitForDeployment();
    
    // Deploy mock SavingsContract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Mint tokens to owner and approve
    await mockToken.mint(owner.address, ethers.parseEther("1000"));
    await mockToken.connect(owner).approve(await mockSavings.getAddress(), ethers.parseEther("1000"));
    
    // Deploy MStableYieldSource
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await mockSavings.getAddress());
    await yieldSource.waitForDeployment();
    
    // Transfer tokens to yield source and approve
    await mockToken.transfer(await yieldSource.getAddress(), ethers.parseEther("500"));
    await mockToken.connect(owner).approve(await yieldSource.getAddress(), ethers.parseEther("1000"));
    
    // Supply tokens to create imBalances for addr1
    const supplyAmount = ethers.parseEther("100");
    await yieldSource.connect(owner).supplyTokenTo(supplyAmount, addr1.address);
    
    // Get the expected balance using original formula: (imBalances * exchangeRate) / 1e18
    const imBalance = await yieldSource.imBalances(addr1.address);
    const exchangeRate = await mockSavings.exchangeRate();
    const expectedBalance = (imBalance * exchangeRate) / ethers.parseEther("1");
    
    // Call balanceOfToken - if mutant is active, it will compute (imBalances * exchangeRate) - 1e18
    // which will be incorrect for non-trivial values
    const actualBalance = await yieldSource.balanceOfToken(addr1.address);
    
    expect(actualBalance).to.equal(expectedBalance);
  });
});