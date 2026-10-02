import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling transfer with an empty _tos array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract has no constructor arguments, so deploy() is fine
    const emptyAddresses: string[] = [];
    const tokenAddress = addr1.address;
    const amount = ethers.parseEther("1");

    // On the original contract, this should revert because _tos.length > 0 is required
    // On the mutant (which removes the require), it would not revert, killing the mutant
    await expect(
      instance.transfer(owner.address, tokenAddress, emptyAddresses, amount)
    ).to.be.reverted;
  });
});