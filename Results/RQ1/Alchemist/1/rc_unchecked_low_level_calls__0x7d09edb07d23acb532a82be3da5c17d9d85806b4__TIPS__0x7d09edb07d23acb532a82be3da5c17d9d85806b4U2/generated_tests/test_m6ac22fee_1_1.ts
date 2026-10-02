import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m6ac22fee", function () {
  it("should emit Win event on successful play, killing mutant that removes emission", async function () {
    const [owner, whale, player] = await ethers.getSigners();

    // Deploy with required constructor arguments: whale address and wager limit
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Set difficulty to a known value that makes winning deterministic
    // difficulty / 2 is the winning number (e.g., difficulty=10 => winning number = 5)
    await instance.connect(owner).AdjustDifficulty(10);

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Player places a wager
    await instance.connect(player).wager({ value: betLimit });

    // Mine a block to ensure block.number > blockNumber stored in timestamps
    await ethers.provider.send("evm_mine", []);

    // Expect Win event to be emitted with the correct payout amount and player address
    // Payout = address(this).balance / 2 = betLimit / 2 (since only player deposited)
    const expectedPayout = betLimit / 2n;

    await expect(instance.connect(player).play())
      .to.emit(instance, "Win")
      .withArgs(expectedPayout, player.address);
  });
});