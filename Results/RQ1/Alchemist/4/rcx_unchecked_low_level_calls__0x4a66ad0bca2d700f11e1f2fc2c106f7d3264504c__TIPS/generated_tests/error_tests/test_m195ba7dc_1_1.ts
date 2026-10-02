import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m195ba7dc", function () {
  it("should detect the sha256 mutation by expecting successful transfer to revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the authorized sender is the owner (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    // In Hardhat test environment, we need to impersonate that address
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Prepare test parameters
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token

    // This should succeed on original but revert on mutant due to wrong selector
    await expect(
      instance.connect(authorizedSigner).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});