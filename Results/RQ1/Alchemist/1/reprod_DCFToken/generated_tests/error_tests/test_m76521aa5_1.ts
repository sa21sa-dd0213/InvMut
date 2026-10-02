import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - kill m76521aa5 (&& instead of || in blacklist check)", function () {
  it("should revert when transferring from a blacklisted address to a non-blacklisted address", async function () {
    const [owner, blacklistedUser, normalUser] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(normalUser.address);
    await instance.waitForDeployment();
    
    // Set CFO (caller) to owner so owner can set blacklist
    await instance.setCaller(owner.address);
    
    // Transfer some tokens to blacklistedUser for testing
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(blacklistedUser.address, transferAmount);
    
    // Blacklist the sender (blacklistedUser)
    await instance.setBlack(blacklistedUser.address, true);
    
    // Attempt to transfer from blacklisted sender to normal recipient
    // In original: !blackAddress[from] || !blackAddress[to] -> false || true -> false -> require fails -> revert
    // In mutant: !blackAddress[from] && !blackAddress[to] -> false && true -> false -> require passes -> no revert (bug)
    await expect(
      instance.connect(blacklistedUser).transfer(normalUser.address, ethers.parseEther("10"))
    ).to.be.revertedWith("black address not transfer");
  });
  
  it("should revert when transferring from a non-blacklisted address to a blacklisted address", async function () {
    const [owner, normalUser, blacklistedRecipient] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(normalUser.address);
    await instance.waitForDeployment();
    
    // Set CFO (caller) to owner so owner can set blacklist
    await instance.setCaller(owner.address);
    
    // Transfer some tokens to normalUser for testing
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(normalUser.address, transferAmount);
    
    // Blacklist the recipient
    await instance.setBlack(blacklistedRecipient.address, true);
    
    // Attempt to transfer from normal sender to blacklisted recipient
    // In original: !blackAddress[from] && !blackAddress[to] -> true && false -> false -> require fails -> revert
    // In mutant: !blackAddress[from] && !blackAddress[to] -> true && false -> false -> require fails -> revert (both same here)
    await expect(
      instance.connect(normalUser).transfer(blacklistedRecipient.address, ethers.parseEther("10"))
    ).to.be.revertedWith("black address not transfer");
  });
});