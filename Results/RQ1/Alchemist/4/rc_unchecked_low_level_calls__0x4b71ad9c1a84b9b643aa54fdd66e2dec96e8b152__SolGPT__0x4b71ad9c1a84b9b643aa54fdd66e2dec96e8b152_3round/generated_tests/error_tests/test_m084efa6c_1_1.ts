import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when external call fails - detects removal of require(_s)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an array of recipients
    const recipients = [addr1.address];

    // Use a random address with no contract as caddress (will fail to execute)
    const fakeContractAddress = ethers.Wallet.createRandom().address;

    // The call will fail because fakeContractAddress has no code
    // Original contract reverts due to require(_s), mutant does not
    await expect(
      instance.transfer(owner.address, fakeContractAddress, recipients, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});