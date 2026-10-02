import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m500a7ec0 test", function () {
  it("should revert when calling wager() for the first time on mutant with != instead of ==", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = ethers.Wallet.createRandom().address;

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Player calls wager() for the first time with exact betLimit
    // Original: should succeed (wagers[player] == 0)
    // Mutant: should revert (requires wagers[player] != 0, but it is 0)
    await expect(
      instance.connect(player).wager({ value: betLimit })
    ).to.be.reverted;
  });
});