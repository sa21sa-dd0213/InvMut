import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m69031d49", function () {
  it("should detect mutant that increments Wager event value by 1", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Player makes a wager with exactly betLimit
    const tx = await instance.connect(player).wager({ value: betLimit });
    const receipt = await tx.wait();

    // Find the Wager event
    const wagerEvent = receipt.logs.find(
      (log) => {
        try {
          const parsed = instance.interface.parseLog(log);
          return parsed?.name === "Wager";
        } catch {
          return false;
        }
      }
    );

    // Parse the event
    const parsedWager = instance.interface.parseLog(wagerEvent!);
    
    // The emitted amount should equal the betLimit (msg.value), NOT betLimit + 1
    expect(parsedWager!.args.amount).to.equal(betLimit);
  });
});