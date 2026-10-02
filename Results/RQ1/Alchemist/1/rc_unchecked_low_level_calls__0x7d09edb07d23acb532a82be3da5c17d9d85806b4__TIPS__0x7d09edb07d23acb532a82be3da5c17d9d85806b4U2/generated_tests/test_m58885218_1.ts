import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PoCGame mutant detection - onlyRealPeople modifier", function () {
  it("should revert when called from a contract (mutant requires msg.sender != tx.origin)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");

    // Deploy PoCGame
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Create a simple contract that will call wager() on our behalf
    const AttackerFactory = await ethers.getContractFactory("Attacker");
    const attacker = await AttackerFactory.deploy(await instance.getAddress());
    await attacker.waitForDeployment();

    // Fund the attacker contract so it can send ETH
    await owner.sendTransaction({
      to: await attacker.getAddress(),
      value: ethers.parseEther("1")
    });

    // The attacker contract calls wager() - this should succeed in the original
    // but fail in the mutant because msg.sender (contract) != tx.origin (owner)
    await expect(
      attacker.connect(owner).attack({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});