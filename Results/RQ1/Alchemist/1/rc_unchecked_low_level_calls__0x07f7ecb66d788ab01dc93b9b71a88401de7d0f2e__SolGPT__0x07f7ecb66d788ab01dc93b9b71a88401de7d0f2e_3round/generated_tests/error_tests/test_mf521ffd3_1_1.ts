import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mf521ffd3", function () {
  it("should revert when same player tries to wager twice (original behavior) but mutant allows it", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const whaleAddress = owner.address; // Using owner as whale for simplicity

    // Deploy contract
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // First wager should succeed
    await instance.connect(player).wager({ value: betLimit });

    // Second wager from same player should revert in original (require wagers[msg.sender] == 0)
    // In mutant, this check is removed so it would succeed
    await expect(
      instance.connect(player).wager({ value: betLimit })
    ).to.be.reverted;
  });
});