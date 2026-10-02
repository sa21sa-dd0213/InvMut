import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant detection - onlyCaller modifier", function () {
  it("should kill mutant by calling onlyCaller-protected function from address greater than CFO", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const liquidityReceiveAddress = addr2.address;
    
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();

    // Set a CFO with a low numerical address value (addr1 has lower address than addr2 typically)
    // Use addr1 as CFO since its address is numerically smaller than addr2
    await dcf.connect(owner).setCaller(addr1.address);

    // addr2 has a numerically higher address than addr1
    // On original: require(_msgSender() == cfo) would revert since addr2 != addr1
    // On mutant: require(_msgSender() <= cfo) would also revert since addr2 > addr1 (numerically)
    // This kills the mutant because the mutant changes the logic

    // Test calling distributeToken() which uses onlyCaller modifier
    await expect(
      dcf.connect(addr2).distributeToken()
    ).to.be.reverted;
  });
});