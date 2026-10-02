import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m5998c066", function () {
  it("should kill the mutant by proving block.timestamp vs block.prevrandao difference", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // User deposits 2 ether with a short unlock time (e.g., 1 second from now)
    const depositAmount = ethers.parseEther("2");
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    const unlockTime = currentTime + 1; // unlocks in 1 second
    
    await instance.connect(user).Put(unlockTime, { value: depositAmount });
    
    // Wait for the unlock time to pass
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 5]);
    await ethers.provider.send("evm_mine");
    
    // Attempt to collect 1 ether - should succeed on original (block.timestamp > unlockTime)
    // but fail on mutant (block.prevrandao is unlikely to be > unlockTime)
    const collectAmount = ethers.parseEther("1");
    
    // On the original contract this would succeed, on the mutant it should revert
    // because block.prevrandao is a random value, not a timestamp
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted; // The mutant will revert because condition fails
  });
});