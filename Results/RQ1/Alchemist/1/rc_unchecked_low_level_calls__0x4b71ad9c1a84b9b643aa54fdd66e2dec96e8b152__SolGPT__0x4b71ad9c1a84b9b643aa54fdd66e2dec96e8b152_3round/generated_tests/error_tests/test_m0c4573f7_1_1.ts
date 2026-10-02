import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant m0c4573f7)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token address (can be any address since we're testing the array length check)
    const tokenAddress = addr2.address;
    
    // Call transfer with an empty _tos array - should revert in original, pass in mutant
    await expect(
      instance.transfer(owner.address, tokenAddress, [], ethers.parseEther("1"))
    ).to.be.reverted;
  });
});