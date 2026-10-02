import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test for transfer function", function () {
  it("should revert when non-allowed address tries to transfer tokens", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with mock addresses for router and USD token
    // Using address(0) as placeholder for router and USD token since we only need to test the transfer function
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000001", // mock router
      "0x0000000000000000000000000000000000000002"  // mock USD token
    );
    await instance.waitForDeployment();

    // Attempt to transfer tokens from a non-allowed address
    // The original contract should revert with "Unauthorized role"
    // The mutant (which removes the check) would allow the transfer
    await expect(
      instance.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
    ).to.be.revertedWith("Unauthorized role");
  });
});