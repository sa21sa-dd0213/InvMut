import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mcb3e48f4 test", function () {
  it("should detect mutant that emits Wager with msg.value-1 instead of msg.value", async function () {
    const [owner, addr1, whale] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whale address and betLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to avoid division by zero (need at least 2 for difficulty/2)
    await instance.connect(owner).AdjustDifficulty(2);

    // Call wager with exact betLimit
    const tx = await instance.connect(addr1).wager({ value: betLimit });

    // Capture the Wager event
    const receipt = await tx.wait();
    const wagerEvent = receipt.logs.find(
      (log: any) => log.fragment && log.fragment.name === "Wager"
    );

    // The original contract emits msg.value, mutant emits msg.value-1
    // Assert that the event emitted amount equals the actual sent value (betLimit)
    expect(wagerEvent).to.not.be.undefined;
    expect(wagerEvent.args.amount).to.equal(betLimit);
  });
});