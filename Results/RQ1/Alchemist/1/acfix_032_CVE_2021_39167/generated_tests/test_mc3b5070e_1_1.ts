import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mc3b5070e", function () {
  it("should emit MinDelayChange event with correct parameters during deployment", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];

    // Deploy the contract
    const contract = await Factory.deploy(minDelay, proposers, executors);
    await contract.deployed();
    const deployTx = contract.deployTransaction;
    const receipt = await deployTx.wait();

    // Check that MinDelayChange event was emitted with correct parameters
    const event = receipt.logs.find(
      (log: any) => {
        try {
          const parsed = Factory.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          return parsed?.name === "MinDelayChange";
        } catch {
          return false;
        }
      }
    );

    expect(event).to.not.be.undefined;
    
    // Parse the event to verify parameters
    const parsedEvent = Factory.interface.parseLog({
      topics: [...event!.topics],
      data: event!.data
    });
    
    expect(parsedEvent.args.oldDuration).to.equal(0n);
    expect(parsedEvent.args.newDuration).to.equal(BigInt(minDelay));
  });
});