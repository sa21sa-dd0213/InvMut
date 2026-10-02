import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - whale address", function () {
  it("should detect mutant where whale is set to contract itself instead of external address", async function () {
    const [owner, whaleAddr, player] = await ethers.getSigners();

    // Deploy with whaleAddr as the whaleAddress parameter
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddr.address, betLimit);
    await instance.waitForDeployment();

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const initialWhaleBalance = await ethers.provider.getBalance(whaleAddr.address);

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to ensure losing (make it so winning number != difficulty/2)
    // difficulty = 10 means winning number is 5, but we'll use block hash to ensure loss
    await instance.connect(owner).AdjustDifficulty(10);

    // Player makes a wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    await wagerTx.wait();

    // Mine a block to ensure block.number > blockNumber stored in timestamps
    await ethers.provider.send("evm_mine", []);

    // Player plays and loses (sending half bet to whale)
    const playTx = await instance.connect(player).play();
    await playTx.wait();

    // Check balances after the loss
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    const finalWhaleBalance = await ethers.provider.getBalance(whaleAddr.address);

    // In the original: half of bet (0.5 ETH) goes to external whale, so whale balance increases
    // In the mutant: half of bet goes to contract itself, so whale balance stays the same
    const halfBet = betLimit / 2n;

    // Assert that the external whale received the funds (original behavior)
    // This will fail on the mutant where funds stay in the contract
    expect(finalWhaleBalance - initialWhaleBalance).to.equal(halfBet);

    // Additional assertion: contract balance should decrease by half the bet in original
    // In mutant, contract balance remains unchanged
    expect(initialContractBalance - finalContractBalance).to.equal(halfBet);
  });
});