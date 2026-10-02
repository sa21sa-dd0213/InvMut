import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m5dc4e801 - onlyRealPeople modifier removed from play()", function () {
  it("should revert when a contract calls play() on original contract, but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the PoCGame contract with required constructor arguments
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open the game to public
    await instance.connect(owner).OpenToThePublic();

    // Deploy a malicious contract that will call play() on our behalf
    const MaliciousFactory = await ethers.getContractFactory("MaliciousCaller");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();

    // First, make addr1 wager normally (must be an EOA to pass onlyRealPeople on wager)
    await instance.connect(addr1).wager({ value: ethers.parseEther("1") });

    // Now try to call play() from the malicious contract
    // The original contract would revert due to onlyRealPeople check (msg.sender != tx.origin)
    // The mutant would allow this call to proceed
    await expect(malicious.callPlay()).to.be.reverted;
  });
});