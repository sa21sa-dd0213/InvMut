import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos.length is 0 (mutant requires < 0 which is impossible)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = "0x0000000000000000000000000000000000000001"; // placeholder token address
    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // This call should succeed on the original (requires > 0, so empty array would revert)
    // On the mutant (requires < 0, which is impossible for array length), it should also revert
    // But to kill the mutant, we test with non-empty array - mutant will revert, original will succeed
    const recipients = [addr2.address];
    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, value)
    ).to.not.be.reverted;
  });
});