import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - balanceOfToken", function () {
  it("should detect exponentiation operator mutant by comparing calculated balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    // Deploy mock SavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Fund owner with tokens and approve
    await mockToken.mint(owner.address, ethers.parseEther("1000"));
    await mockToken.connect(owner).approve(await mockSavings.getAddress(), ethers.parseEther("1000"));
    
    // Deploy MStableYieldSource
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const instance = await MStableYieldSource.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Supply tokens to create imBalances for addr1
    const supplyAmount = ethers.parseEther("100");
    await mockToken.connect(owner).transfer(addr1.address, supplyAmount);
    await mockToken.connect(addr1).approve(await instance.getAddress(), supplyAmount);
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);
    
    // Get exchange rate (1:1 from mock)
    const exchangeRate = await mockSavings.exchangeRate();
    
    // Get imBalances for addr1
    const imBalance = await instance.imBalances(addr1.address);
    
    // Expected: (imBalances * exchangeRate) / 1e18
    const expectedBalance = (imBalance * exchangeRate) / BigInt(1e18);
    
    // Call balanceOfToken - mutant would compute imBalances ** exchangeRate
    const actualBalance = await instance.balanceOfToken(addr1.address);
    
    // Assert equality - mutant would produce astronomically different result
    expect(actualBalance).to.equal(expectedBalance);
  });
});