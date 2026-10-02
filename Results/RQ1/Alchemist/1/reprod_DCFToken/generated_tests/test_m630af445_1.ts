import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m630af445 - setCaller hardcoded to USDT", function () {
  it("should kill mutant by proving cfo is not set to the provided address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address (any non-zero address)
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr1.address);
    await instance.waitForDeployment();

    // Initially, cfo is not set (address(0)), so onlyOwner functions work
    // Set caller to addr1 using setCaller
    const setCallerTx = await instance.connect(owner).setCaller(addr1.address);
    await setCallerTx.wait();

    // Now try to call a onlyCaller function from addr1
    // If the mutant is active, cfo is hardcoded to USDT address, so addr1 should NOT be able to call it
    // We'll try distributeToken which is onlyCaller
    // First we need some tokens in the contract to avoid "Insufficient token balance" revert
    // Transfer some tokens to the contract
    const transferAmount = ethers.parseEther("3000");
    await instance.connect(owner).transfer(await instance.getAddress(), transferAmount);
    
    // Set distribute address so distributeToken doesn't revert
    await instance.connect(addr1).setDistributeAddress(addr2.address);

    // Attempt to call distributeToken from addr1
    // On original: succeeds because cfo = addr1
    // On mutant: reverts because cfo = USDT address, not addr1
    await expect(
      instance.connect(addr1).distributeToken()
    ).to.be.revertedWith("onlyCaller");
  });
});