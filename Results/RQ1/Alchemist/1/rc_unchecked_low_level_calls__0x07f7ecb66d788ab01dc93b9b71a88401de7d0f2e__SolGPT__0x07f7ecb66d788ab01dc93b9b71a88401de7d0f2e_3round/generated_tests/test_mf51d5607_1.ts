import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - onlyPlayers modifier", function () {
  it("should revert when a non-wagering user tries to call play()", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract with constructor arguments: whaleAddress and wagerLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr2.address, betLimit);
    await instance.waitForDeployment();

    // Open the game to the public
    await instance.connect(owner).OpenToThePublic();

    // Have addr1 place a wager to satisfy the onlyPlayers modifier for addr1
    await instance.connect(addr1).wager({ value: betLimit });

    // Now addr2 (who has NOT wagered) tries to call play()
    // In the original contract this should revert because wagers[addr2] == 0
    // In the mutant (>= 0) this would succeed - killing the mutant if it reverts
    await expect(
      instance.connect(addr2).play()
    ).to.be.reverted;
  });
});