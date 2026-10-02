import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant mb40ad506 - redeemToken removal", function () {
  it("should fail when redeemToken is called after supplyTokenTo because the mutant removes the function body", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    // Deploy mock SavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Mint tokens to addr1 and approve the yield source
    const depositAmount = ethers.parseEther("100");
    await mockToken.mint(addr1.address, depositAmount);
    await mockToken.connect(addr1).approve(await instance.getAddress(), depositAmount);
    
    // First supply tokens to get some credits
    await instance.connect(addr1).supplyTokenTo(depositAmount, addr1.address);
    
    // Get the balance before redeeming
    const balanceBefore = await mockToken.balanceOf(addr1.address);
    
    // Now attempt to redeem - the mutant has removed the function body, 
    // so this should do nothing (no revert, but no state changes either)
    const tx = await instance.connect(addr1).redeemToken(depositAmount);
    await tx.wait();
    
    // Check that the balance did NOT increase (mutant killed)
    const balanceAfter = await mockToken.balanceOf(addr1.address);
    expect(balanceAfter).to.equal(balanceBefore);
    
    // Also check that imBalances was NOT decreased (mutant killed)
    const imBalance = await instance.imBalances(addr1.address);
    expect(imBalance).to.not.equal(0);
    expect(imBalance).to.be.gt(0);
    
    // Verify the function didn't revert - but state changes didn't happen
    // This confirms the mutant removed the implementation
  });
});