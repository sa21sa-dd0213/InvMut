import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - mf4bf64db", function () {
  it("should grant PROPOSER_ROLE to proposers passed in constructor", async function () {
    const [owner, proposer1, proposer2] = await ethers.getSigners();
    
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const minDelay = 3600; // 1 hour
    const proposers = [proposer1.address, proposer2.address];
    const executors: string[] = [];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Verify that both proposers have the PROPOSER_ROLE after deployment
    expect(await instance.hasRole(PROPOSER_ROLE, proposer1.address)).to.equal(true);
    expect(await instance.hasRole(PROPOSER_ROLE, proposer2.address)).to.equal(true);
  });
});