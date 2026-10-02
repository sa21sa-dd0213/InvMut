import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mf7e6a611 test", function () {
  it("should revert when contract_address is the zero address (original behavior), but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // Attempt to call transfer with zero address as contract_address
    // In original: reverts due to require(addr != address(0x0))
    // In mutant: no such check, so it should proceed (and potentially succeed or revert differently)
    await expect(
      instance.transfer(ethers.ZeroAddress, tos, vs)
    ).to.be.reverted;
  });
});