import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant ma292a7d2 - wager without isOpenToPublic modifier", function () {
  it("should revert when wagering before contract is opened to the public", async function () {
    const [owner, player] = await ethers.getSigners();
    const whaleAddress = owner.address; // any valid address for whale
    const wagerLimit = ethers.parseEther("1.0");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // The contract is deployed with openToPublic = false
    // Attempt to wager before opening to public - should revert in original
    await expect(
      instance.connect(player).wager({ value: wagerLimit })
    ).to.be.reverted;
  });
});