import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - me91742fd", function () {
  it("should emit Wager event when wager() is called; mutant removing the emit should fail", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const whaleAddress = ethers.Wallet.createRandom().address;

    // Deploy the contract with constructor arguments: whaleAddress, wagerLimit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to the public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Player makes a wager with exact betLimit amount
    const tx = await instance.connect(player).wager({ value: betLimit });

    // Expect the Wager event to be emitted with the correct parameters
    await expect(tx)
      .to.emit(instance, "Wager")
      .withArgs(betLimit, player.address);
  });
});