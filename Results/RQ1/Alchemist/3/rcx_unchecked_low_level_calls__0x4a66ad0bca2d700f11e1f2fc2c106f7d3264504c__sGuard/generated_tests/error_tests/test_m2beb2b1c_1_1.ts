import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2beb2b1c", function () {
  it("should revert when called from an address numerically lower than the authorized address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // Try addr1 first
    const addr1Address = await addr1.getAddress();
    let lowerSigner = addr1;

    // Check if addr1 is numerically lower than authorized
    if (addr1Address.toLowerCase() >= authorizedAddress.toLowerCase()) {
      // Try addr2
      const addr2Address = await addr2.getAddress();
      if (addr2Address.toLowerCase() < authorizedAddress.toLowerCase()) {
        lowerSigner = addr2;
      } else {
        // Use owner as fallback (might not kill the mutant if owner is authorized)
        lowerSigner = owner;
      }
    }

    const tx = instance.connect(lowerSigner).transfer(
      ["0x0000000000000000000000000000000000000001"],
      [1]
    );
    await expect(tx).to.be.reverted;
  });
});