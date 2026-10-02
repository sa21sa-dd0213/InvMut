import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m2b59bc00 - distributeAmount exponentiation bug", function () {
  it("should kill the mutant by verifying distributeAmount is computed correctly", async function () {
    const [owner, addr1, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with constructor argument
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Set up the caller (cfo) to be able to call distributeToken
    await dcf.setCaller(addr1.address);
    
    // Get the contract balance (should have 2,000,000 * 1e18 initial supply minus what was sent to liquidity)
    // First, let's get the distributeAmount value from the contract storage
    // Since distributeAmount is a private variable, we can check the behavior
    
    // Transfer some tokens to the contract so it has balance for distribution
    // The contract already has some tokens from fee mechanism, but let's ensure it has enough
    const initialSupply = ethers.parseEther("2000000");
    const ownerBalance = await dcf.balanceOf(owner.address);
    
    // Send tokens to contract to ensure it has enough balance for distribution
    const transferAmount = ethers.parseEther("10000");
    await dcf.transfer(await dcf.getAddress(), transferAmount);
    
    // Verify contract has balance
    const contractBalance = await dcf.balanceOf(await dcf.getAddress());
    expect(contractBalance).to.be.gte(ethers.parseEther("2000"));
    
    // Set the distribute address
    await dcf.connect(addr1).setDistributeAddress(addr2.address);
    
    // Call distributeToken - this should succeed with original (2000 * 1e18 = 2000e18)
    // but fail with mutant (2000 ** 1e18 = astronomical number > contract balance)
    await expect(
      dcf.connect(addr1).distributeToken()
    ).to.not.be.reverted;
    
    // Verify that exactly 2000 * 1e18 tokens were transferred to distribute address
    const distributeeBalance = await dcf.balanceOf(addr2.address);
    expect(distributeeBalance).to.equal(ethers.parseEther("2000"));
  });
});