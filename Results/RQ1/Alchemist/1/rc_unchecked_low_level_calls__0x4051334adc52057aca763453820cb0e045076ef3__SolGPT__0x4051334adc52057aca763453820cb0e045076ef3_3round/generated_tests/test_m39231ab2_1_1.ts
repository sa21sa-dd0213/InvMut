import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant that uses >= instead of >)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock token contract address (use a simple EOA since no token logic is needed)
    const mockTokenAddress = addr1.address;
    
    // Call transfer with empty _tos array - original should revert, mutant would not
    await expect(
      instance.transfer(
        owner.address,
        mockTokenAddress,
        [], // empty _tos array
        100
      )
    ).to.be.reverted;
  });
});