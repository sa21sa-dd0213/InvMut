import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant m86ffadae (distributionFinished never set)", function () {
  let instance: any;
  let owner: any;
  let investor: any;

  beforeEach(async function () {
    [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    // Constructor takes no arguments (checking the contract - no constructor defined)
    instance = await Factory.deploy();
    await instance.waitForDeployment();
  });

  it("should set distributionFinished to true after full distribution", async function () {
    // The mutant changes `if (totalDistributed >= totalSupply)` to `if (false)`
    // so the distributionFinished flag will never be set to true.
    // We need to distribute enough tokens to reach totalSupply.

    // First, call NETM() to allocate the initial totalDistributed to owner
    await instance.connect(owner).NETM();

    // Get current totalDistributed and totalSupply
    const totalSupply = await instance.totalSupply();
    let totalDistributed = await instance.totalDistributed();

    // Calculate remaining tokens to reach totalSupply
    const remaining = totalSupply - totalDistributed;

    // The getTokens() function distributes `value` tokens to the caller.
    // We need to call it multiple times from different addresses (since blacklist is set after each call).
    // First, let's check the current value
    let currentValue = await instance.value();

    // We'll use a helper function to distribute tokens
    async function distributeFromSigner(signer: any) {
      // Ensure the signer is not blacklisted
      const isBlacklisted = await instance.blacklist(signer.address);
      if (!isBlacklisted) {
        // Check if we still have distribution active
        const finished = await instance.distributionFinished();
        if (!finished) {
          // Send exactly 0 ether to trigger getTokens (payable but no ether required)
          await instance.connect(signer).getTokens({ value: 0 });
        }
      }
    }

    // Keep distributing until totalDistributed >= totalSupply
    let iterations = 0;
    const maxIterations = 50; // safety limit

    while (iterations < maxIterations) {
      totalDistributed = await instance.totalDistributed();
      if (totalDistributed >= totalSupply) break;

      // Get a new signer for each call (since blacklist is set)
      const newSigner = (await ethers.getSigners())[iterations + 2]; // skip owner and investor
      await distributeFromSigner(newSigner);
      iterations++;
    }

    // Now check: in the original contract, distributionFinished should be true
    // In the mutant, it will remain false
    const finished = await instance.distributionFinished();

    // If the mutant is present, finished will be false - so expect true to fail
    expect(finished).to.equal(true);

    // Additional check: calling getTokens should revert when distribution is finished
    // (In original: canDistr modifier requires !distributionFinished)
    await expect(
      instance.connect(investor).getTokens({ value: 0 })
    ).to.be.reverted;
  });
});