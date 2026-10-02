import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m19454879 - winnersPot", function () {
  it("should return half of contract balance, not balance + 2", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player.address, betLimit);
    await instance.waitForDeployment();

    // Make contract open to public and set difficulty so play() works
    await instance.connect(owner).OpenToThePublic();
    await instance.connect(owner).AdjustDifficulty(10);

    // Player makes a wager to put ETH into the contract
    await instance.connect(player).wager({ value: betLimit });

    // Get the contract balance after wager
    const contractBalance = await ethers.provider.getBalance(instance.target);

    // Expected half balance
    const expectedHalf = contractBalance / 2n;

    // Call winnersPot() - mutant returns balance + 2 instead of balance / 2
    const pot = await instance.winnersPot();

    // Assert that pot equals half the balance (original behavior)
    // Mutant would return contractBalance + 2n, which will NOT equal expectedHalf
    expect(pot).to.equal(expectedHalf);
  });
});