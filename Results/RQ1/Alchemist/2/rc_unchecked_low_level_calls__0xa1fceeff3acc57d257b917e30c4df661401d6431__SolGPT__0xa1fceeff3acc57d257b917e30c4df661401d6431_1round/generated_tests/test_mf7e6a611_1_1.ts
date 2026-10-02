import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mf7e6a611 test", function () {
  it("should revert when calling transfer with zero address as contract_address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // Calling with address(0) should revert in original but not in mutant
    await expect(
      instance.connect(owner).transfer(ethers.ZeroAddress, tos, vs)
    ).to.be.reverted;
  });
});