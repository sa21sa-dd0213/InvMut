import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m1190c5fd - USDT replaced with address(this)", function () {
  it("should revert when non-whitelisted user tries to sell tokens due to USDT being contract itself", async function () {
    const [owner, user, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiver.address);
    await instance.waitForDeployment();
    
    // Get the helper address and pair address
    const helperAddress = await instance.helperAddress();
    const pairAddress = await instance.pairAddress();
    
    // Set the CFO to owner for setting up whitelist/blacklist
    await instance.setCaller(owner.address);
    
    // Whitelist the user temporarily to transfer tokens to them
    await instance.setWhite(user.address, true);
    
    // Transfer tokens to user for testing
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(user.address, transferAmount);
    
    // Remove user from whitelist so they are subject to fees
    await instance.setWhite(user.address, false);
    
    // Approve the DCF contract to spend user's tokens (needed for transferFrom simulation)
    // We'll simulate a sell by transferring from user to pair address
    await instance.connect(user).approve(instance.target, transferAmount);
    
    // Attempt to sell tokens by transferring to pair address
    // This should trigger the fee swapping logic which will fail because USDT is address(this)
    await expect(
      instance.connect(user).transfer(pairAddress, transferAmount)
    ).to.be.reverted;
    
    // Verify that the USDT address is indeed the contract itself (confirming mutant behavior)
    expect(await instance.USDT()).to.equal(instance.target);
  });
});