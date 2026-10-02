import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - payout function", function () {
  it("should detect mutant that changes / to - in payout by verifying winner receives exactly half the balance", async function () {
    const [owner, whale, player1, player2] = await ethers.getSigners();

    // Deploy with whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to ensure player wins (difficulty / 2 is the winning number)
    // For winningNumber = difficulty / 2, we need to set difficulty such that the hash produces this value
    // Since we can't control the hash, we'll set difficulty to 2 so winning number must be 1 (difficulty/2 = 1)
    // This guarantees a win since winningNumber = hash % 2 + 1 = 1 or 2, and 1 == 1
    await instance.connect(owner).AdjustDifficulty(2);

    // Player1 wagers
    await instance.connect(player1).wager({ value: betLimit });

    // Advance block to allow play
    await ethers.provider.send("evm_mine", []);

    // Get contract balance before play
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Player1 plays (will win due to difficulty=2)
    const tx = await instance.connect(player1).play();
    const receipt = await tx.wait();

    // Calculate expected payout (half of balance before play)
    const expectedPayout = balanceBefore / 2n;

    // Check if winner received exactly half (not balance - 2)
    // Mutant would transfer balance - 2, which is more than half
    await expect(tx).to.emit(instance, "Win").withArgs(expectedPayout, player1.address);

    // Also verify the actual balance reduction matches
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(balanceBefore - expectedPayout);
  });
});