import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - transfer to zero address", function () {
  it("should revert when transferring to zero address, but mutant will not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 first so owner has less than total supply
    await instance.transfer(addr1.address, 100);

    // Attempt to transfer tokens to zero address
    // In original contract, this should revert because of require(_to != address(0))
    // In mutant (missing this check), the transfer will succeed
    const zeroAddress = ethers.ZeroAddress;

    await expect(
      instance.transfer(zeroAddress, 50)
    ).to.be.reverted;
  });
});