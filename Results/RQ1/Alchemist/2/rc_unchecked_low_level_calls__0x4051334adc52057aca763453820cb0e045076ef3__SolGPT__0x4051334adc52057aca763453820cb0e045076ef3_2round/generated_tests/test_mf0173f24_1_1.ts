import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling transfer with an empty _tos array (kills mutant that removes require(_tos.length > 0))", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Mock token address (any valid address, as the call will never execute with empty array)
    const mockTokenAddress = ethers.Wallet.createRandom().address;

    // Call transfer with empty _tos array - original should revert, mutant should not
    await expect(
      instance.transfer(
        owner.address,
        mockTokenAddress,
        [],
        100
      )
    ).to.be.reverted;
  });
});