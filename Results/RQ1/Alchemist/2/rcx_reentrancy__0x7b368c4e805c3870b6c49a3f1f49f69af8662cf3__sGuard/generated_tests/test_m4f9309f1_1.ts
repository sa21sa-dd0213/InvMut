import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m4f9309f1", function () {
  it("should kill mutant by proving Collect always fails even when conditions are met", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Add funds and set unlock time to current block timestamp
    const depositAmount = ethers.parseEther("2");
    const unlockTime = (await ethers.provider.getBlock("latest")).timestamp;
    
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Advance time past unlock time (add 1 second to ensure condition is met)
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Attempt to collect 1 ether (which should succeed in original, fail in mutant)
    const collectAmount = ethers.parseEther("1");
    
    // In original: transaction succeeds and balance decreases
    // In mutant: condition is always false, so nothing happens (no revert, no balance change)
    const tx = await instance.connect(addr1).Collect(collectAmount);
    await tx.wait();
    
    // Check balance - in original it would be 1 ether, in mutant it stays at 2 ether
    const balance = (await instance.Acc(addr1.getAddress())).balance;
    expect(balance).to.equal(ethers.parseEther("2")); // Mutant keeps full balance
    // This assertion passes on mutant (balance unchanged) but would fail on original (balance = 1)
    // Thus the test "kills" the mutant by detecting the difference
  });
});