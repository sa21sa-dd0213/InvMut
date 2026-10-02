import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - m9d1e9839", function () {
  it("should kill mutant by calling approve with a non-zero owner address and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with constructor arguments (router and USD token addresses)
    // Using dummy addresses since we only need to test the approve function
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000001", // dummy router
      "0x0000000000000000000000000000000000000002"  // dummy USD token
    );
    await instance.waitForDeployment();

    // Test: approve from a non-zero owner (addr1) to addr2
    // This should succeed on the original contract
    // The mutant incorrectly requires owner == address(0), so it will revert
    await expect(
      instance.connect(addr1).approve(addr2.address, ethers.parseEther("100"))
    ).to.not.be.reverted;
  });
});