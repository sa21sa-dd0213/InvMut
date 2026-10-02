import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m4a723d66", function () {
  it("should revert when contract address is the contract itself (original behavior), but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: single recipient and value
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // Attempt to call transfer with the contract's own address as contract_address
    // Original contract should revert due to validAddress modifier
    // Mutant would not revert here (but may fail later in the call)
    await expect(
      instance.transfer(await instance.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});