import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mc424e1d0", function () {
  it("should detect missing Wager event emission in wager() function", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const whaleAddress = ethers.Wallet.createRandom().address;

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public (required by wager)
    await instance.connect(owner).OpenToThePublic();

    // Player makes a wager - expect Wager event to be emitted
    const wagerTx = await instance.connect(player).wager({ value: betLimit });

    // Assert that the Wager event was emitted with correct parameters
    await expect(wagerTx)
      .to.emit(instance, "Wager")
      .withArgs(betLimit, player.address);
  });
});