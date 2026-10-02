import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant ma04c9573 - wager value check", function () {
  it("should revert when wagering an amount different from betLimit", async function () {
    const [owner, player] = await ethers.getSigners();
    const whaleAddress = ethers.Wallet.createRandom().address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Owner opens the contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player tries to wager with a different amount than betLimit (e.g., 0.5 ETH instead of 1 ETH)
    const wrongAmount = ethers.parseEther("0.5");
    await expect(
      instance.connect(player).wager({ value: wrongAmount })
    ).to.be.reverted;
  });
});