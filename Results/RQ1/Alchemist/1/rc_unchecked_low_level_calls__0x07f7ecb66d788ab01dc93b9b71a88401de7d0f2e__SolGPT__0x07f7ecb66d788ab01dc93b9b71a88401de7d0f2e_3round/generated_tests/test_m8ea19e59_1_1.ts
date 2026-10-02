import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m8ea19e59 - Donate event emission", function () {
  it("should emit Donate event when donate() is called", async function () {
    const [owner, whale, player] = await ethers.getSigners();

    // Deploy contract with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open contract to public (onlyOwner)
    await instance.connect(owner).OpenToThePublic();

    // Player makes a wager to become a player (required for donate to work properly)
    // Note: donate() is public and requires only isOpenToPublic() modifier, no wager needed
    // Send ether to donate
    const donateAmount = ethers.parseEther("0.5");

    // Assert that the Donate event is emitted with correct parameters
    await expect(instance.connect(player).donate({ value: donateAmount }))
      .to.emit(instance, "Donate")
      .withArgs(donateAmount, whale.address, player.address);
  });
});