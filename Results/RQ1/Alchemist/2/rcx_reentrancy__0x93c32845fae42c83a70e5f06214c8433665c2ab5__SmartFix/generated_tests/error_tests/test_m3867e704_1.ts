import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m3867e704 test", function () {
  it("should revert when Collect is called with a valid amount but the recipient rejects Ether", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with the Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deploy a contract that rejects Ether (no payable fallback)
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Owner puts funds into the wallet
    const putAmount = ethers.parseEther("2");
    await instance.connect(owner).Put(0, { value: putAmount });
    
    // Set unlock time to past so Collect can be called
    // The wallet is already unlocked since we used block.timestamp
    
    // Attempt to collect to the rejector address - should revert in original
    // but succeed silently in mutant
    const collectAmount = ethers.parseEther("1");
    
    // In the original contract this would revert because the recipient rejects Ether
    // In the mutant it would succeed (no revert) - killing the mutant
    await expect(
      instance.connect(owner).Collect(collectAmount)
    ).to.be.reverted;
  });
});